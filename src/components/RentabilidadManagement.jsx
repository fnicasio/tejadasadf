import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { recalculatePersonalCount } from '../utils/dbUtils';
import { 
  ArrowLeft, 
  Search, 
  Check, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  HelpCircle,
  Briefcase,
  UserCheck
} from 'lucide-react';

export function RentabilidadManagement({ onBack }) {
  const [comunidades, setComunidades] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Key format: `${communityId}-${role}` where role is 'gestor' or 'contable'
  // Value: 'saving' | 'success' | 'error'
  const [savingState, setSavingState] = useState({});

  // Sync communities and personal from Firestore
  useEffect(() => {
    // Sync comunidades
    const qComm = query(collection(db, 'comunidades'));
    const unsubComm = onSnapshot(qComm, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort alphabetically by community name
      items.sort((a, b) => (a.comunidad || '').localeCompare(b.comunidad || '', 'es', { sensitivity: 'base' }));
      setComunidades(items);
    }, (error) => {
      console.error("Error syncing comunidades in Rentabilidad:", error);
    });

    // Sync personal
    const qPers = query(collection(db, 'personal'));
    const unsubPers = onSnapshot(qPers, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPersonal(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Error syncing personal in Rentabilidad:", error);
      setIsLoading(false);
    });

    return () => {
      unsubComm();
      unsubPers();
    };
  }, []);

  // Filter personal by roles
  const gestoresList = personal.filter(p => p.tipo === 'Gestor' || p.tipo === 'Gestor/Contable');
  const contablesList = personal.filter(p => p.tipo === 'Contable' || p.tipo === 'Gestor/Contable');

  // Filter communities by search text
  const filteredComunidades = comunidades.filter(comm => {
    if (!searchQuery.trim()) return true;
    return comm.comunidad?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handle assignment select change
  const handleAssignmentChange = async (community, role, newPersonId) => {
    const key = `${community.id}-${role}`;
    setSavingState(prev => ({ ...prev, [key]: 'saving' }));

    // Identify old assigned person ID
    const oldPersonId = role === 'gestor' ? community.gestorId : community.contableId;

    // Find new person's name
    const newPerson = personal.find(p => p.id === newPersonId);
    const newPersonName = newPerson ? newPerson.nombre : '';

    try {
      const communityDocRef = doc(db, 'comunidades', community.id);
      
      const updateData = {};
      if (role === 'gestor') {
        updateData.gestorId = newPersonId || '';
        updateData.gestorName = newPersonName;
      } else {
        updateData.contableId = newPersonId || '';
        updateData.contableName = newPersonName;
      }

      // Update community in Firestore
      await updateDoc(communityDocRef, updateData);

      // Recalculate workload count for new person if assigned
      if (newPersonId) {
        await recalculatePersonalCount(newPersonId);
      }
      
      // Recalculate workload count for old person if changed
      if (oldPersonId && oldPersonId !== newPersonId) {
        await recalculatePersonalCount(oldPersonId);
      }

      setSavingState(prev => ({ ...prev, [key]: 'success' }));

      // Auto-clear success state checkmark after 2 seconds
      setTimeout(() => {
        setSavingState(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 2000);

    } catch (err) {
      console.error("Firestore assignment update error:", err);
      setSavingState(prev => ({ ...prev, [key]: 'error' }));

      // Auto-clear error state after 3 seconds
      setTimeout(() => {
        setSavingState(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }, 3000);
    }
  };

  // Helper to render saving/status elements next to dropdowns
  const renderStatus = (communityId, role) => {
    const status = savingState[`${communityId}-${role}`];
    if (status === 'saving') {
      return <div className="spinner-micro" style={{ borderTopColor: 'var(--gold-dark)' }} />;
    }
    if (status === 'success') {
      return <Check size={14} className="text-success animate-fade-in" style={{ color: 'var(--success)' }} />;
    }
    if (status === 'error') {
      return <AlertCircle size={14} className="text-error" style={{ color: 'var(--error)' }} />;
    }
    return null;
  };

  // Summary Metrics calculations
  const totalComunidades = comunidades.length;
  const totalVecinos = comunidades.reduce((sum, c) => sum + (c.n_vecinos || 0), 0);
  const totalFacturacion = comunidades.reduce((sum, c) => sum + (c.total || 0), 0);

  return (
    <div className="personal-panel w-full" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Top Header Bar */}
      <div className="panel-header-bar flex items-center justify-between mb-6">
        <button onClick={onBack} className="btn-back-link flex items-center gap-4">
          <ArrowLeft size={16} />
          <span>Volver al Dashboard</span>
        </button>
        
        <h2 className="font-serif text-2xl font-bold m-0" style={{ color: 'var(--primary-medium)' }}>
          Rentabilidad Personal
        </h2>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="rentabilidad-container">
        
        {/* Left Column (66% on desktop) - Communities Assignment */}
        <div className="personal-card-container" style={{ marginTop: 0 }}>
          
          {/* Actions/Search header */}
          <div className="table-actions-header">
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
            
            <span className="text-xs text-muted font-medium">
              Mostrando {filteredComunidades.length} de {comunidades.length} comunidades
            </span>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="spinner" style={{ borderTopColor: 'var(--gold-dark)', borderWidth: '3px' }} />
              <p className="text-muted mt-4" style={{ fontSize: '14px' }}>Cargando datos...</p>
            </div>
          ) : filteredComunidades.length === 0 ? (
            <div className="empty-table-state">
              <Users size={48} className="text-muted mb-4" style={{ opacity: 0.5 }} />
              <p className="empty-title">Sin registros</p>
              <p className="empty-desc">
                {comunidades.length === 0 
                  ? 'Añade comunidades primero en la sección "Gestión de Comunidades".' 
                  : 'Ninguna comunidad coincide con la búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="personal-table">
                <thead>
                  <tr>
                    <th className="sticky-col" style={{ minWidth: '180px' }}>Comunidad</th>
                    <th style={{ minWidth: '180px' }}>Gestor Asignado</th>
                    <th style={{ minWidth: '180px' }}>Contable Asignado</th>
                    <th style={{ minWidth: '100px', textAlign: 'right' }}>BI</th>
                    <th style={{ minWidth: '85px', textAlign: 'right' }}>IVA</th>
                    <th style={{ minWidth: '100px', textAlign: 'right' }}>TOTAL</th>
                    <th style={{ minWidth: '85px', textAlign: 'center' }}>Vecinos</th>
                    <th style={{ minWidth: '85px', textAlign: 'center' }}>Garajes</th>
                    <th style={{ minWidth: '85px', textAlign: 'center' }}>Piscina</th>
                    <th style={{ minWidth: '100px', textAlign: 'center' }}>Pistas Dep.</th>
                    <th style={{ minWidth: '110px', textAlign: 'center' }}>Sala Gourmet</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComunidades.map((comm) => (
                    <tr key={comm.id}>
                      <td className="font-semibold sticky-col" style={{ color: 'var(--primary-dark)', verticalAlign: 'middle' }}>
                        {comm.comunidad}
                      </td>
                      
                      {/* Gestor Selector */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div className="flex items-center gap-2">
                          <select
                            className="select-inline-table"
                            value={comm.gestorId || ''}
                            onChange={(e) => handleAssignmentChange(comm, 'gestor', e.target.value)}
                            disabled={savingState[`${comm.id}-gestor`] === 'saving'}
                          >
                            <option value="">-- Sin asignar --</option>
                            {gestoresList.map(g => (
                              <option key={g.id} value={g.id}>{g.nombre}</option>
                            ))}
                          </select>
                          <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                            {renderStatus(comm.id, 'gestor')}
                          </div>
                        </div>
                      </td>

                      {/* Contable Selector */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div className="flex items-center gap-2">
                          <select
                            className="select-inline-table"
                            value={comm.contableId || ''}
                            onChange={(e) => handleAssignmentChange(comm, 'contable', e.target.value)}
                            disabled={savingState[`${comm.id}-contable`] === 'saving'}
                          >
                            <option value="">-- Sin asignar --</option>
                            {contablesList.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                          <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                            {renderStatus(comm.id, 'contable')}
                          </div>
                        </div>
                      </td>

                      {/* Community Details */}
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        {comm.bi !== undefined ? `${comm.bi.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '0,00 €'}
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        {comm.iva !== undefined ? `${comm.iva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '0,00 €'}
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: '600' }}>
                        {comm.total !== undefined ? `${comm.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '0,00 €'}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {comm.n_vecinos || 0}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span className={`badge-type ${comm.garajes ? 'Gestor' : 'Contable'}`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                          {comm.garajes ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span className={`badge-type ${comm.piscina ? 'Gestor' : 'Contable'}`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                          {comm.piscina ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span className={`badge-type ${comm.pistas_deportivas ? 'Gestor' : 'Contable'}`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                          {comm.pistas_deportivas ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span className={`badge-type ${comm.sala_gourmet ? 'Gestor' : 'Contable'}`} style={{ padding: '2px 8px', fontSize: '11px' }}>
                          {comm.sala_gourmet ? 'Sí' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (33% on desktop) - Dashboard Summary */}
        <div className="rentabilidad-sidebar-placeholder">
          <div className="sidebar-card">
            <div className="sidebar-card-header mb-6">
              <TrendingUp size={24} style={{ color: 'var(--gold-dark)' }} />
              <h3 className="font-serif text-lg font-bold m-0" style={{ color: 'var(--primary-medium)' }}>
                Resumen de Control
              </h3>
            </div>
            
            <div className="sidebar-divider mb-6"></div>

            {/* KPI Cards / Metrics */}
            <div className="flex flex-col gap-6">
              
              <div className="metric-box flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--cream-light)', border: '1px solid var(--cream-dark)' }}>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(194, 157, 91, 0.15)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide font-semibold text-muted mb-1">Total Comunidades</div>
                  <div className="text-xl font-bold" style={{ color: 'var(--primary-dark)', fontFamily: 'var(--font-sans)' }}>{totalComunidades}</div>
                </div>
              </div>

              <div className="metric-box flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--cream-light)', border: '1px solid var(--cream-dark)' }}>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(90, 63, 47, 0.1)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide font-semibold text-muted mb-1">Total Vecinos</div>
                  <div className="text-xl font-bold" style={{ color: 'var(--primary-dark)', fontFamily: 'var(--font-sans)' }}>{totalVecinos}</div>
                </div>
              </div>

              <div className="metric-box flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'var(--cream-light)', border: '1px solid var(--cream-dark)' }}>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(54, 143, 92, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center' }}>
                  <TrendingUp size={20} style={{ color: 'var(--success)' }} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide font-semibold text-muted mb-1">Total Facturación</div>
                  <div className="text-xl font-bold" style={{ color: 'var(--primary-dark)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>
                    {totalFacturacion.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default RentabilidadManagement;
