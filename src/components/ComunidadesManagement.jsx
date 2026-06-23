import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  AlertTriangle,
  Home,
  Search,
  Filter,
  ArrowUpDown,
  Upload,
  Check,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export function ComunidadesManagement({ onBack }) {
  const [comunidades, setComunidades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGarajes, setFilterGarajes] = useState(false);
  const [filterPiscina, setFilterPiscina] = useState(false);
  const [filterPistas, setFilterPistas] = useState(false);
  const [filterSala, setFilterSala] = useState(false);

  // Sorting States
  const [sortField, setSortField] = useState('comunidad'); // default sort by community name
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Modal Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(null);
  
  const [comunidadName, setComunidadName] = useState('');
  const [bi, setBi] = useState('');

  const [nVecinos, setNVecinos] = useState('');
  const [hasGarajes, setHasGarajes] = useState(false);
  const [hasPiscina, setHasPiscina] = useState(false);
  const [hasPistas, setHasPistas] = useState(false);
  const [hasSala, setHasSala] = useState(false);
  
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirm States
  const [deletingCommunity, setDeletingCommunity] = useState(null);

  // CSV Import States
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // Real-time Firestore sync
  useEffect(() => {
    const q = query(collection(db, 'comunidades'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      setComunidades(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore comunidades sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Multi-field toggle filter & Search logic
  const filteredComunidades = comunidades.filter((comm) => {
    // Text search filter
    if (searchQuery.trim()) {
      const matchText = comm.comunidad?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchText) return false;
    }

    // Equipment filters (AND behavior)
    if (filterGarajes && !comm.garajes) return false;
    if (filterPiscina && !comm.piscina) return false;
    if (filterPistas && !comm.pistas_deportivas) return false;
    if (filterSala && !comm.sala_gourmet) return false;

    return true;
  });

  // Client-side Sorting logic (reactive to clicking table headers)
  const sortedComunidades = [...filteredComunidades].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    // Undefined fallback
    if (valA === undefined) valA = '';
    if (valB === undefined) valB = '';

    // Convert strings to lowercase for proper sorting
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }

    // Number sorting
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    // Boolean sorting (true values first if desc, false first if asc)
    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      const numA = valA ? 1 : 0;
      const numB = valB ? 1 : 0;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Form calculated values in real time (fixed to standard 21% IVA)
  const calculatedIvaValue = () => {
    const base = parseFloat(bi) || 0;
    return parseFloat((base * 0.21).toFixed(2));
  };

  const calculatedTotalValue = () => {
    const base = parseFloat(bi) || 0;
    const ivaVal = calculatedIvaValue();
    return parseFloat((base + ivaVal).toFixed(2));
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingCommunity(null);
    setComunidadName('');
    setBi('');
    setNVecinos('');
    setHasGarajes(false);
    setHasPiscina(false);
    setHasPistas(false);
    setHasSala(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (comm) => {
    setEditingCommunity(comm);
    setComunidadName(comm.comunidad || '');
    setBi(comm.bi?.toString() || '');
    setNVecinos(comm.n_vecinos?.toString() || '');
    setHasGarajes(!!comm.garajes);
    setHasPiscina(!!comm.piscina);
    setHasPistas(!!comm.pistas_deportivas);
    setHasSala(!!comm.sala_gourmet);
    setFormError('');
    setIsModalOpen(true);
  };

  // CRUD Save
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!comunidadName.trim()) {
      setFormError('El nombre de la comunidad es obligatorio.');
      return;
    }
    const parsedBi = parseFloat(bi);
    if (isNaN(parsedBi) || parsedBi < 0) {
      setFormError('Introduce una base imponible (BI) válida.');
      return;
    }
    const parsedNeighbors = parseInt(nVecinos);
    if (isNaN(parsedNeighbors) || parsedNeighbors < 0) {
      setFormError('Introduce un número de vecinos válido.');
      return;
    }

    setIsSaving(true);
    
    // Auto-calculate outputs
    const ivaAmt = calculatedIvaValue();
    const totalAmt = calculatedTotalValue();

    const data = {
      comunidad: comunidadName.trim(),
      bi: parsedBi,
      iva_percent: 21,
      iva: ivaAmt,
      total: totalAmt,
      n_vecinos: parsedNeighbors,
      garajes: hasGarajes,
      piscina: hasPiscina,
      pistas_deportivas: hasPistas,
      sala_gourmet: hasSala,
      updatedAt: Date.now()
    };

    try {
      if (editingCommunity) {
        // Edit Mode
        const docRef = doc(db, 'comunidades', editingCommunity.id);
        await updateDoc(docRef, data);
      } else {
        // Add Mode
        await addDoc(collection(db, 'comunidades'), {
          ...data,
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving community:", err);
      setFormError('Ocurrió un error al guardar. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // CRUD Delete
  const handleDeleteConfirm = async () => {
    if (!deletingCommunity) return;
    try {
      await deleteDoc(doc(db, 'comunidades', deletingCommunity.id));
      setDeletingCommunity(null);
    } catch (err) {
      console.error("Error deleting community:", err);
      alert('Ocurrió un error al intentar eliminar la comunidad.');
    }
  };

  // CSV Importer Parsing Engine
  const handleCSVImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleCSVFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Leyendo archivo...');
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const fileText = evt.target?.result;
      if (typeof fileText !== 'string') {
        setIsImporting(false);
        setImportStatus('Error al leer el archivo.');
        return;
      }

      try {
        const lines = fileText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) {
          throw new Error('El archivo CSV está vacío o solo contiene la cabecera.');
        }

        // Determine separator: split by semicolon or comma on the header row
        const header = lines[0];
        const separator = header.includes(';') ? ';' : ',';
        
        setImportStatus(`Parseando ${lines.length - 1} registros...`);

        // Helper to parse boolean strings in Spanish/English
        const parseBool = (str) => {
          if (!str) return false;
          const clean = str.trim().toLowerCase();
          return clean === 'si' || clean === 'sí' || clean === 'yes' || clean === 'true' || clean === '1';
        };

        let importedCount = 0;
        
        // Loop over the data rows (skipping header)
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(separator);
          if (cols.length < 3 || !cols[0].trim()) continue; // Skip incomplete lines

          const comunidadNameCSV = cols[0].trim();
          const biCSV = parseFloat(cols[1]?.replace(',', '.')) || 0;
          const nVecinosCSV = parseInt(cols[2]) || 0;
          
          const garajesCSV = parseBool(cols[3]);
          const piscinaCSV = parseBool(cols[4]);
          const pistasCSV = parseBool(cols[5]);
          const salaCSV = parseBool(cols[6]);

          const ivaPercentCSV = 21; // standard 21% rate

          // Calculate totals
          const calculatedIva = parseFloat((biCSV * 0.21).toFixed(2));
          const calculatedTotal = parseFloat((biCSV + calculatedIva).toFixed(2));

          // Save directly to Firestore
          await addDoc(collection(db, 'comunidades'), {
            comunidad: comunidadNameCSV,
            bi: biCSV,
            iva_percent: ivaPercentCSV,
            iva: calculatedIva,
            total: calculatedTotal,
            n_vecinos: nVecinosCSV,
            garajes: garajesCSV,
            piscina: piscinaCSV,
            pistas_deportivas: pistasCSV,
            sala_gourmet: salaCSV,
            createdAt: Date.now()
          });

          importedCount++;
        }

        setImportStatus(`¡Importación exitosa! Se añadieron ${importedCount} comunidades.`);
        setTimeout(() => {
          setIsImporting(false);
          setImportStatus('');
        }, 3000);
      } catch (err) {
        console.error("CSV import error:", err);
        setImportStatus(`Error: ${err.message}`);
        setTimeout(() => {
          setIsImporting(false);
          setImportStatus('');
        }, 4000);
      }
    };

    reader.onerror = () => {
      setIsImporting(false);
      setImportStatus('Error de lectura del archivo.');
    };

    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  return (
    <div className="personal-panel w-full" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Top Header Bar */}
      <div className="panel-header-bar flex items-center justify-between mb-6">
        <button onClick={onBack} className="btn-back-link flex items-center gap-4">
          <ArrowLeft size={16} />
          <span>Volver al Dashboard</span>
        </button>
        
        <h2 className="font-serif text-2xl font-bold m-0" style={{ color: 'var(--primary-medium)' }}>
          Gestión de Comunidades
        </h2>
      </div>

      {/* Main Container */}
      <div className="personal-card-container">
        
        {/* CSV Status Banners */}
        {isImporting && (
          <div className="alert alert-success mb-6" style={{ background: 'rgba(194, 157, 91, 0.15)', borderColor: 'var(--gold)', color: 'var(--primary-medium)' }}>
            <Upload className="animate-bounce" size={18} />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Toolbar: Search, Filters, Add & Import */}
        <div className="table-actions-header flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Left search input */}
          <div className="search-box-wrapper relative" style={{ flexGrow: 1, maxWidth: '300px' }}>
            <Search className="input-icon" size={18} style={{ top: '13px' }} />
            <input 
              type="text" 
              placeholder="Buscar comunidad..." 
              className="form-input" 
              style={{ paddingLeft: '44px', height: '42px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Hidden File Input for CSV Import */}
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleCSVFileChange}
          />

          {/* Action buttons on the right */}
          <div className="flex items-center gap-4 flex-wrap">
            <button 
              onClick={handleCSVImportClick} 
              className="btn-signout" 
              style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={isImporting}
              title="Importa las comunidades cargando un archivo CSV"
            >
              <Upload size={16} />
              <span>Importar CSV</span>
            </button>

            <button onClick={handleOpenAddModal} className="btn-primary" style={{ width: 'auto', padding: '0 20px', height: '42px' }}>
              <Plus size={16} />
              <span>Añadir Comunidad</span>
            </button>
          </div>
        </div>

        {/* Filter Toggle Chips */}
        <div className="table-filters-row mb-6 flex items-center justify-between flex-wrap gap-4" style={{ borderTop: '1px solid var(--cream-dark)', paddingTop: '16px' }}>
          <div className="filters-wrapper">
            <div className="filter-label-group flex items-center gap-4 text-muted">
              <Filter size={16} style={{ color: 'var(--gold-dark)' }} />
              <span className="font-semibold" style={{ fontSize: '13px' }}>Filtrar equipamientos:</span>
            </div>
            
            <div className="filter-chips">
              <button 
                onClick={() => setFilterGarajes(!filterGarajes)} 
                className={`filter-chip ${filterGarajes ? 'active' : ''}`}
              >
                Con Garaje
              </button>
              <button 
                onClick={() => setFilterPiscina(!filterPiscina)} 
                className={`filter-chip ${filterPiscina ? 'active' : ''}`}
              >
                Con Piscina
              </button>
              <button 
                onClick={() => setFilterPistas(!filterPistas)} 
                className={`filter-chip ${filterPistas ? 'active' : ''}`}
              >
                Pistas Dep.
              </button>
              <button 
                onClick={() => setFilterSala(!filterSala)} 
                className={`filter-chip ${filterSala ? 'active' : ''}`}
              >
                Sala Gourmet
              </button>
            </div>
          </div>
          <span className="text-xs text-muted font-medium">
            Mostrando {sortedComunidades.length} de {comunidades.length} comunidades
          </span>
        </div>

        {/* Interactive Table with reactive column sorting */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="spinner" style={{ borderTopColor: 'var(--gold-dark)', borderWidth: '3px' }} />
            <p className="text-muted mt-4" style={{ fontSize: '14px' }}>Cargando comunidades...</p>
          </div>
        ) : sortedComunidades.length === 0 ? (
          <div className="empty-table-state">
            <Home size={48} className="text-muted mb-4" style={{ opacity: 0.5 }} />
            <p className="empty-title">Sin comunidades registradas</p>
            <p className="empty-desc">
              No se han encontrado registros. Añade una comunidad manualmente o importa datos desde un CSV.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="personal-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('comunidad')} className="sortable-header">
                    <div className="flex items-center gap-4">
                      <span>Comunidad</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'comunidad' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('bi')} className="sortable-header" style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-center gap-4" style={{ justifyContent: 'flex-end' }}>
                      <span>BI</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'bi' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('iva')} className="sortable-header" style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-center gap-4" style={{ justifyContent: 'flex-end' }}>
                      <span>IVA</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'iva' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('total')} className="sortable-header" style={{ textAlign: 'right' }}>
                    <div className="flex items-center justify-center gap-4" style={{ justifyContent: 'flex-end' }}>
                      <span>Total</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'total' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('n_vecinos')} className="sortable-header" style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-4">
                      <span>Vecinos</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'n_vecinos' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('garajes')} className="sortable-header" style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-4">
                      <span>Garajes</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'garajes' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('piscina')} className="sortable-header" style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-4">
                      <span>Piscina</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'piscina' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('pistas_deportivas')} className="sortable-header" style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-4">
                      <span>Pistas</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'pistas_deportivas' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('sala_gourmet')} className="sortable-header" style={{ textAlign: 'center' }}>
                    <div className="flex items-center justify-center gap-4">
                      <span>Sala G.</span>
                      <ArrowUpDown size={14} className={`sort-icon ${sortField === 'sala_gourmet' ? 'active' : ''}`} />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right', minWidth: '90px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedComunidades.map((comm) => (
                  <tr key={comm.id}>
                    <td className="font-semibold" style={{ color: 'var(--primary-dark)' }}>
                      {comm.comunidad}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '500' }}>
                      {comm.bi?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      {comm.iva?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      <span className="text-xs" style={{ marginLeft: '4px', opacity: 0.7 }}>({comm.iva_percent}%)</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary-medium)' }}>
                      {comm.total?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {comm.n_vecinos}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {comm.garajes ? <Check className="text-success" style={{ color: 'var(--success)', margin: '0 auto' }} size={16} /> : <X className="text-muted" style={{ opacity: 0.3, margin: '0 auto' }} size={16} />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {comm.piscina ? <Check className="text-success" style={{ color: 'var(--success)', margin: '0 auto' }} size={16} /> : <X className="text-muted" style={{ opacity: 0.3, margin: '0 auto' }} size={16} />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {comm.pistas_deportivas ? <Check className="text-success" style={{ color: 'var(--success)', margin: '0 auto' }} size={16} /> : <X className="text-muted" style={{ opacity: 0.3, margin: '0 auto' }} size={16} />}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {comm.sala_gourmet ? <Check className="text-success" style={{ color: 'var(--success)', margin: '0 auto' }} size={16} /> : <X className="text-muted" style={{ opacity: 0.3, margin: '0 auto' }} size={16} />}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-group">
                        <button 
                          onClick={() => handleOpenEditModal(comm)} 
                          className="btn-action-icon edit" 
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => setDeletingCommunity(comm)} 
                          className="btn-action-icon delete" 
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insert & Edit Modal form */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '600px', animation: 'fadeInUp 0.3s ease-out' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCommunity ? 'Editar Comunidad' : 'Añadir Nueva Comunidad'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-modal-close">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '24px' }}>
                {formError && (
                  <div className="alert alert-error mb-4" style={{ gridColumn: 'span 2', padding: '8px 12px', fontSize: '13px' }}>
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nombre de la Comunidad</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '16px' }}
                    placeholder="Ej. Urb. Los Naranjos Portal A"
                    value={comunidadName}
                    onChange={(e) => setComunidadName(e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </div>

                {/* BI */}
                <div className="form-group">
                  <label className="form-label">Base Imponible (BI)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    style={{ paddingLeft: '16px' }}
                    placeholder="Ej. 1200.00"
                    value={bi}
                    onChange={(e) => setBi(e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </div>

                {/* Dynamic read-only computed Cuota IVA box */}
                <div className="form-group" style={{ background: 'var(--cream-light)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--cream-dark)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuota IVA (21%)</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary-light)' }}>
                    {calculatedIvaValue().toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>

                {/* Dynamic read-only computed Total box */}
                <div className="form-group" style={{ gridColumn: 'span 2', background: 'var(--cream-light)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--cream-dark)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Presupuestado (Con IVA)</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary-medium)' }}>
                    {calculatedTotalValue().toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </span>
                </div>

                {/* Neighbors */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Número de Vecinos</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: '16px' }}
                    placeholder="Ej. 24"
                    value={nVecinos}
                    onChange={(e) => setNVecinos(e.target.value)}
                    disabled={isSaving}
                    required
                  />
                </div>

                {/* Checkbox fields in layout */}
                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  <label className="flex items-center gap-4 font-semibold" style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--primary-dark)' }}>
                    <input 
                      type="checkbox" 
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--gold-dark)' }}
                      checked={hasGarajes}
                      onChange={(e) => setHasGarajes(e.target.checked)}
                      disabled={isSaving}
                    />
                    <span>¿Dispone de Garajes?</span>
                  </label>

                  <label className="flex items-center gap-4 font-semibold" style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--primary-dark)' }}>
                    <input 
                      type="checkbox" 
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--gold-dark)' }}
                      checked={hasPiscina}
                      onChange={(e) => setHasPiscina(e.target.checked)}
                      disabled={isSaving}
                    />
                    <span>¿Dispone de Piscina?</span>
                  </label>

                  <label className="flex items-center gap-4 font-semibold" style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--primary-dark)' }}>
                    <input 
                      type="checkbox" 
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--gold-dark)' }}
                      checked={hasPistas}
                      onChange={(e) => setHasPistas(e.target.checked)}
                      disabled={isSaving}
                    />
                    <span>¿Pistas Deportivas?</span>
                  </label>

                  <label className="flex items-center gap-4 font-semibold" style={{ cursor: 'pointer', fontSize: '14px', color: 'var(--primary-dark)' }}>
                    <input 
                      type="checkbox" 
                      style={{ transform: 'scale(1.2)', accentColor: 'var(--gold-dark)' }}
                      checked={hasSala}
                      onChange={(e) => setHasSala(e.target.checked)}
                      disabled={isSaving}
                    />
                    <span>¿Sala Gourmet / Multiusos?</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ gridColumn: 'span 2' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn-signout"
                  style={{ borderColor: 'rgba(62, 39, 26, 0.2)', color: 'var(--text-muted)' }}
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '10px 24px' }}
                  disabled={isSaving}
                >
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCommunity && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-container" style={{ maxWidth: '400px', animation: 'fadeInUp 0.3s ease-out' }}>
            <div className="modal-body text-center" style={{ paddingTop: '32px' }}>
              <div className="confirm-icon-box mb-4">
                <AlertTriangle size={36} style={{ color: 'var(--error)' }} />
              </div>
              <h3 className="font-serif text-lg font-bold mb-2" style={{ color: 'var(--primary-dark)' }}>
                ¿Confirmar eliminación?
              </h3>
              <p className="text-muted" style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
                ¿Estás seguro de que deseas eliminar la comunidad <strong style={{ color: 'var(--primary-medium)' }}>{deletingCommunity.comunidad}</strong>? 
                Esta acción borrará de forma permanente sus datos en la base de datos de Firebase.
              </p>
            </div>
            
            <div className="modal-footer" style={{ borderTop: 'none', background: 'transparent', paddingBottom: '24px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setDeletingCommunity(null)} 
                className="btn-signout"
                style={{ borderColor: 'rgba(62, 39, 26, 0.2)', color: 'var(--text-muted)' }}
              >
                Cancelar
              </button>
              
              <button 
                type="button" 
                onClick={handleDeleteConfirm} 
                className="btn-primary" 
                style={{ width: 'auto', padding: '10px 24px', backgroundColor: 'var(--error)', background: 'var(--error)', boxShadow: '0 4px 15px rgba(201, 59, 59, 0.2)' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ComunidadesManagement;
