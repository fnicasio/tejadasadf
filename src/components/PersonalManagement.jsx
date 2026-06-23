import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
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
  User,
  Briefcase,
  Layers,
  Filter
} from 'lucide-react';

export function PersonalManagement({ onBack }) {
  const [personal, setPersonal] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [filterGestor, setFilterGestor] = useState(false);
  const [filterContable, setFilterContable] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null); // holds person object if editing, null if adding
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Gestor');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation States
  const [deletingPerson, setDeletingPerson] = useState(null); // holds person object to delete, null if none

  // Real-time Firestore sync
  useEffect(() => {
    const q = query(collection(db, 'personal'), orderBy('nombre', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPersonal(items);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter application logic
  const filteredPersonal = personal.filter((person) => {
    // If no filter or both filters are checked, show all
    if (!filterGestor && !filterContable) return true;
    if (filterGestor && filterContable) return true;
    
    // Gestor/Contable matches both filters
    if (person.tipo === 'Gestor/Contable') return true;
    
    if (filterGestor) {
      return person.tipo === 'Gestor';
    }
    
    if (filterContable) {
      return person.tipo === 'Contable';
    }
    
    return false;
  });

  // Modal opening handlers
  const handleOpenAddModal = () => {
    setEditingPerson(null);
    setNombre('');
    setTipo('Gestor');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (person) => {
    setEditingPerson(person);
    setNombre(person.nombre || '');
    setTipo(person.tipo || 'Gestor');
    setFormError('');
    setIsModalOpen(true);
  };

  // CRUD Save: Add or Edit
  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPerson) {
        // Edit Mode
        const personRef = doc(db, 'personal', editingPerson.id);
        await updateDoc(personRef, {
          nombre: nombre.trim(),
          tipo: tipo
        });
      } else {
        // Add Mode
        await addDoc(collection(db, 'personal'), {
          nombre: nombre.trim(),
          tipo: tipo,
          n_comunidades: 0, // default calculated value
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving to Firestore:", err);
      setFormError('Ocurrió un error al guardar. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // CRUD Delete: Confirm and Execute
  const handleDeleteConfirm = async () => {
    if (!deletingPerson) return;
    try {
      await deleteDoc(doc(db, 'personal', deletingPerson.id));
      setDeletingPerson(null);
    } catch (err) {
      console.error("Error deleting from Firestore:", err);
      alert('No se pudo eliminar el registro. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="personal-panel w-full" style={{ animation: 'fadeIn 0.5s ease' }}>
      
      {/* Panel Top Header Bar */}
      <div className="panel-header-bar flex items-center justify-between mb-6">
        <button onClick={onBack} className="btn-back-link flex items-center gap-4">
          <ArrowLeft size={16} />
          <span>Volver al Dashboard</span>
        </button>
        
        <h2 className="font-serif text-2xl font-bold m-0" style={{ color: 'var(--primary-medium)' }}>
          Gestión de Personal
        </h2>
      </div>

      <div className="personal-card-container">
        
        {/* Actions Header (Add button & Filter controls) */}
        <div className="table-actions-header">
          {/* Filters on the left */}
          <div className="filters-wrapper">
            <div className="filter-label-group flex items-center gap-4 text-muted">
              <Filter size={16} style={{ color: 'var(--gold-dark)' }} />
              <span className="font-medium" style={{ fontSize: '14px' }}>Filtrar por:</span>
            </div>
            
            <div className="filter-chips">
              <button 
                onClick={() => setFilterGestor(!filterGestor)}
                className={`filter-chip ${filterGestor ? 'active' : ''}`}
              >
                Gestores
              </button>
              <button 
                onClick={() => setFilterContable(!filterContable)}
                className={`filter-chip ${filterContable ? 'active' : ''}`}
              >
                Contables
              </button>
            </div>
          </div>

          {/* Add button on the right */}
          <button onClick={handleOpenAddModal} className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>
            <Plus size={16} />
            <span>Añadir Personal</span>
          </button>
        </div>

        {/* Real-time Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="spinner" style={{ borderTopColor: 'var(--gold-dark)', borderWidth: '3px' }} />
            <p className="text-muted mt-4" style={{ fontSize: '14px' }}>Cargando personal...</p>
          </div>
        ) : filteredPersonal.length === 0 ? (
          <div className="empty-table-state">
            <User size={48} className="text-muted mb-4" style={{ opacity: 0.5 }} />
            <p className="empty-title">No hay registros de personal</p>
            <p className="empty-desc">
              {personal.length === 0 
                ? 'Comienza añadiendo un nuevo gestor o contable de la oficina.' 
                : 'Ningún registro coincide con los filtros de búsqueda seleccionados.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="personal-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'center' }}>N. Comunidades</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonal.map((person) => (
                  <tr key={person.id}>
                    <td className="font-semibold" style={{ color: 'var(--primary-dark)' }}>
                      {person.nombre}
                    </td>
                    <td>
                      <span className={`badge-type ${person.tipo.replace('/', '-')}`}>
                        {person.tipo}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '500' }}>
                      {person.n_comunidades ?? 0}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-buttons-group">
                        <button 
                          onClick={() => handleOpenEditModal(person)} 
                          className="btn-action-icon edit" 
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button 
                          onClick={() => setDeletingPerson(person)} 
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

      {/* Insert / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingPerson ? 'Editar Personal' : 'Añadir Nuevo Personal'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-modal-close">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error mb-4" style={{ padding: '8px 12px', fontSize: '13px' }}>
                    <AlertTriangle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group mb-4">
                  <label className="form-label" htmlFor="nombre-input">
                    Nombre Completo
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="nombre-input"
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '16px' }}
                      placeholder="Ej. Juan Pérez García"
                      value={nombre}
                      onChange={(e) => {
                        setNombre(e.target.value);
                        if (formError) setFormError('');
                      }}
                      disabled={isSaving}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="tipo-select">
                    Tipo de Puesto
                  </label>
                  <div className="input-wrapper">
                    <select
                      id="tipo-select"
                      className="form-input"
                      style={{ paddingLeft: '16px', appearance: 'auto', background: 'white' }}
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value)}
                      disabled={isSaving}
                    >
                      <option value="Gestor">Gestor</option>
                      <option value="Contable">Contable</option>
                      <option value="Gestor/Contable">Gestor/Contable</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
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

      {/* Delete Confirmation Modal */}
      {deletingPerson && (
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
                ¿Estás seguro de que deseas eliminar a <strong style={{ color: 'var(--primary-medium)' }}>{deletingPerson.nombre}</strong>? 
                Esta acción no se puede deshacer y borrará los datos de la base de datos de Firebase.
              </p>
            </div>
            
            <div className="modal-footer" style={{ borderTop: 'none', background: 'transparent', paddingBottom: '24px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => setDeletingPerson(null)} 
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

export default PersonalManagement;
