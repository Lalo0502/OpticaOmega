"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Search, Loader2, Edit, Trash2, X, UserRound, Calendar, Mail, Phone, 
  MapPin, User, Users, FileText, AlertCircle, ClipboardList, Stethoscope, Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Tipos para los pacientes y condiciones médicas
interface Patient {
  id: string;
  created_at: string;
  primer_nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  direccion: string | null;
  telefono: string;
  email: string | null;
  fecha_nacimiento: string | null;
  notas: string | null;
  condiciones?: CondicionMedica[];
}

interface CondicionMedica {
  id: string;
  nombre: string;
  descripcion: string | null;
  paciente_condicion_id?: string;
  fecha_diagnostico?: string | null;
  notas?: string | null;
  isSelected?: boolean;
}

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("datos-personales");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [condicionesMedicas, setCondicionesMedicas] = useState<CondicionMedica[]>([]);
  const [selectedCondiciones, setSelectedCondiciones] = useState<CondicionMedica[]>([]);
  const [condicionActual, setCondicionActual] = useState<string>("");
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    primer_nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    direccion: "",
    telefono: "",
    email: "",
    fecha_nacimiento: "",
    notas: ""
  });

  // Cargar pacientes desde Supabase
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from("pacientes")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          // Para cada paciente, obtener sus condiciones médicas
          const patientsWithConditions = await Promise.all(
            data.map(async (patient) => {
              const { data: condicionesData, error: condicionesError } = await supabase
                .from("paciente_condiciones")
                .select(`
                  id,
                  fecha_diagnostico,
                  notas,
                  condiciones_medicas (
                    id,
                    nombre,
                    descripcion
                  )
                `)
                .eq("paciente_id", patient.id);

              if (condicionesError) {
                console.error("Error al cargar condiciones:", condicionesError);
                return patient;
              }

              // Transformar los datos para que sean más fáciles de usar
              const condiciones = condicionesData?.map(item => ({
                id: item.condiciones_medicas.id,
                nombre: item.condiciones_medicas.nombre,
                descripcion: item.condiciones_medicas.descripcion,
                paciente_condicion_id: item.id,
                fecha_diagnostico: item.fecha_diagnostico,
                notas: item.notas
              })) || [];

              return {
                ...patient,
                condiciones
              };
            })
          );

          setPatients(patientsWithConditions);
        }
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los pacientes",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [toast]);

  // Cargar condiciones médicas disponibles
  useEffect(() => {
    const fetchCondicionesMedicas = async () => {
      try {
        const { data, error } = await supabase
          .from("condiciones_medicas")
          .select("*")
          .order("nombre");

        if (error) {
          throw error;
        }

        if (data) {
          setCondicionesMedicas(data);
        }
      } catch (error) {
        console.error("Error al cargar condiciones médicas:", error);
      }
    };

    fetchCondicionesMedicas();
  }, []);

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Resetear el formulario
  const resetForm = () => {
    setFormData({
      primer_nombre: "",
      primer_apellido: "",
      segundo_apellido: "",
      direccion: "",
      telefono: "",
      email: "",
      fecha_nacimiento: "",
      notas: ""
    });
    setSelectedCondiciones([]);
    setActiveTab("datos-personales");
    setIsEditing(false);
    setIsViewMode(false);
    setCurrentPatientId(null);
  };

  // Abrir diálogo para editar
  const handleEdit = (patient: Patient) => {
    setFormData({
      primer_nombre: patient.primer_nombre,
      primer_apellido: patient.primer_apellido,
      segundo_apellido: patient.segundo_apellido || "",
      direccion: patient.direccion || "",
      telefono: patient.telefono,
      email: patient.email || "",
      fecha_nacimiento: patient.fecha_nacimiento || "",
      notas: patient.notas || ""
    });
    
    // Establecer las condiciones médicas del paciente
    setSelectedCondiciones(patient.condiciones || []);
    
    setIsEditing(true);
    setIsViewMode(false);
    setCurrentPatientId(patient.id);
    setIsDialogOpen(true);
  };

  // Abrir diálogo para ver detalles
  const handleViewDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailDialogOpen(true);
  };

  // Eliminar paciente
  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
      try {
        const { error } = await supabase
          .from("pacientes")
          .delete()
          .eq("id", id);

        if (error) {
          throw error;
        }

        setPatients(patients.filter(patient => patient.id !== id));
        toast({
          title: "Paciente eliminado",
          description: "El paciente ha sido eliminado correctamente",
        });
      } catch (error) {
        console.error("Error al eliminar paciente:", error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el paciente",
          variant: "destructive",
        });
      }
    }
  };

  // Añadir condición médica al paciente
  const handleAddCondicion = () => {
    if (!condicionActual) return;
    
    const condicion = condicionesMedicas.find(c => c.id === condicionActual);
    if (!condicion) return;
    
    // Verificar si ya está seleccionada
    if (selectedCondiciones.some(c => c.id === condicion.id)) {
      toast({
        title: "Condición ya añadida",
        description: "Esta condición médica ya ha sido añadida al paciente",
      });
      return;
    }
    
    setSelectedCondiciones([...selectedCondiciones, {
      ...condicion,
      fecha_diagnostico: null,
      notas: null
    }]);
    
    setCondicionActual("");
  };

  // Eliminar condición médica del paciente
  const handleRemoveCondicion = (id: string) => {
    setSelectedCondiciones(selectedCondiciones.filter(c => c.id !== id));
  };

  // Actualizar datos de una condición médica
  const handleCondicionChange = (id: string, field: string, value: string) => {
    setSelectedCondiciones(selectedCondiciones.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  // Guardar paciente
  const handleSavePatient = async () => {
    try {
      // Validar campos requeridos
      if (!formData.primer_nombre || !formData.primer_apellido || !formData.telefono) {
        toast({
          title: "Error",
          description: "Por favor completa los campos obligatorios",
          variant: "destructive",
        });
        return;
      }

      let patientId = currentPatientId;
      
      if (isEditing && currentPatientId) {
        // Actualizar paciente existente
        const { data, error } = await supabase
          .from("pacientes")
          .update({
            primer_nombre: formData.primer_nombre,
            primer_apellido: formData.primer_apellido,
            segundo_apellido: formData.segundo_apellido || null,
            direccion: formData.direccion || null,
            telefono: formData.telefono,
            email: formData.email || null,
            fecha_nacimiento: formData.fecha_nacimiento || null,
            notas: formData.notas || null
          })
          .eq("id", currentPatientId)
          .select();

        if (error) {
          throw error;
        }
      } else {
        // Crear nuevo paciente
        const { data, error } = await supabase
          .from("pacientes")
          .insert({
            primer_nombre: formData.primer_nombre,
            primer_apellido: formData.primer_apellido,
            segundo_apellido: formData.segundo_apellido || null,
            direccion: formData.direccion || null,
            telefono: formData.telefono,
            email: formData.email || null,
            fecha_nacimiento: formData.fecha_nacimiento || null,
            notas: formData.notas || null
          })
          .select();

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          patientId = data[0].id;
        }
      }

      // Si tenemos un ID de paciente, actualizar sus condiciones médicas
      if (patientId) {
        // 1. Si estamos editando, eliminar las relaciones existentes
        if (isEditing) {
          const { error: deleteError } = await supabase
            .from("paciente_condiciones")
            .delete()
            .eq("paciente_id", patientId);
          
          if (deleteError) {
            console.error("Error al eliminar condiciones existentes:", deleteError);
          }
        }
        
        // 2. Insertar las nuevas relaciones
        if (selectedCondiciones.length > 0) {
          const condicionesInsert = selectedCondiciones.map(condicion => ({
            paciente_id: patientId,
            condicion_id: condicion.id,
            fecha_diagnostico: condicion.fecha_diagnostico || null,
            notas: condicion.notas || null
          }));
          
          const { error: insertError } = await supabase
            .from("paciente_condiciones")
            .insert(condicionesInsert);
          
          if (insertError) {
            console.error("Error al insertar condiciones:", insertError);
          }
        }
      }

      // Actualizar la lista de pacientes
      const { data: updatedPatient, error: fetchError } = await supabase
        .from("pacientes")
        .select("*")
        .eq("id", patientId)
        .single();
      
      if (fetchError) {
        console.error("Error al obtener paciente actualizado:", fetchError);
      } else if (updatedPatient) {
        // Obtener las condiciones médicas actualizadas
        const { data: condicionesData, error: condicionesError } = await supabase
          .from("paciente_condiciones")
          .select(`
            id,
            fecha_diagnostico,
            notas,
            condiciones_medicas (
              id,
              nombre,
              descripcion
            )
          `)
          .eq("paciente_id", patientId);
        
        const condiciones = condicionesData?.map(item => ({
          id: item.condiciones_medicas.id,
          nombre: item.condiciones_medicas.nombre,
          descripcion: item.condiciones_medicas.descripcion,
          paciente_condicion_id: item.id,
          fecha_diagnostico: item.fecha_diagnostico,
          notas: item.notas
        })) || [];
        
        const patientWithConditions = {
          ...updatedPatient,
          condiciones
        };
        
        if (isEditing) {
          setPatients(patients.map(p => p.id === patientId ? patientWithConditions : p));
          toast({
            title: "Paciente actualizado",
            description: "Los datos del paciente han sido actualizados correctamente",
          });
        } else {
          setPatients([patientWithConditions, ...patients]);
          toast({
            title: "Paciente agregado",
            description: "El paciente ha sido agregado correctamente",
          });
        }
      }

      // Cerrar diálogo y resetear formulario
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar paciente:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el paciente",
        variant: "destructive",
      });
    }
  };

  // Filtrar pacientes según término de búsqueda
  const filteredPatients = patients.filter(
    (patient) =>
      patient.primer_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.primer_apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.segundo_apellido && patient.segundo_apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      patient.telefono.includes(searchTerm) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (patient.condiciones && patient.condiciones.some(c => 
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      ))
  );

  // Formatear fecha para mostrar
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: es });
    } catch (error) {
      return dateString;
    }
  };

  // Obtener iniciales para el avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la información de tus pacientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 mb-2 border-b">
              <DialogTitle className="text-xl">
                {isEditing ? "Editar Paciente" : "Agregar Nuevo Paciente"}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Modifica los datos del paciente" : "Ingresa los datos del nuevo paciente"}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="datos-personales" className="gap-2">
                  <User className="h-4 w-4" />
                  Datos Personales
                </TabsTrigger>
                <TabsTrigger value="datos-medicos" className="gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Datos Médicos
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="datos-personales" className="space-y-4 py-2">
                <div className="space-y-4">
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <User className="h-4 w-4 text-primary" />
                      <span>Información Personal</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primer_nombre" className="text-sm font-medium flex items-center gap-1.5">
                          <span>Primer Nombre</span>
                          <span className="text-primary ml-0.5">*</span>
                        </Label>
                        <Input
                          id="primer_nombre"
                          value={formData.primer_nombre}
                          onChange={handleInputChange}
                          className="w-full"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="primer_apellido" className="text-sm font-medium flex items-center gap-1.5">
                          <span>Primer Apellido</span>
                          <span className="text-primary ml-0.5">*</span>
                        </Label>
                        <Input
                          id="primer_apellido"
                          value={formData.primer_apellido}
                          onChange={handleInputChange}
                          className="w-full"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="segundo_apellido" className="text-sm font-medium flex items-center gap-1.5">
                        <span>Segundo Apellido</span>
                      </Label>
                      <Input
                        id="segundo_apellido"
                        value={formData.segundo_apellido}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="fecha_nacimiento" className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Fecha de Nacimiento</span>
                      </Label>
                      <Input
                        id="fecha_nacimiento"
                        type="date"
                        value={formData.fecha_nacimiento}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <Phone className="h-4 w-4 text-primary" />
                      <span>Información de Contacto</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="telefono" className="text-sm font-medium flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Teléfono</span>
                        <span className="text-primary ml-0.5">*</span>
                      </Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={handleInputChange}
                        className="w-full"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Correo Electrónico</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="direccion" className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Dirección</span>
                      </Label>
                      <Input
                        id="direccion"
                        value={formData.direccion}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setActiveTab("datos-medicos")}>
                    Siguiente
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="datos-medicos" className="space-y-4 py-2">
                <div className="space-y-4">
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <ClipboardList className="h-4 w-4 text-primary" />
                      <span>Condiciones Médicas</span>
                    </div>
                    
                    <div className="flex gap-2 mb-4">
                      <Select value={condicionActual} onValueChange={setCondicionActual}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccionar condición médica" />
                        </SelectTrigger>
                        <SelectContent>
                          {condicionesMedicas.map((condicion) => (
                            <SelectItem key={condicion.id} value={condicion.id}>
                              {condicion.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={handleAddCondicion} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Añadir
                      </Button>
                    </div>
                    
                    {selectedCondiciones.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedCondiciones.map((condicion) => (
                          <div key={condicion.id} className="p-3 rounded-lg border border-border/60 bg-card relative">
                            <button 
                              type="button"
                              onClick={() => handleRemoveCondicion(condicion.id)}
                              className="absolute top-2 right-2 h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            
                            <div className="flex justify-between items-center mb-1">
                              <div className="font-medium text-sm">{condicion.nombre}</div>
                            </div>
                            
                            <div className="text-xs text-muted-foreground mb-2">{condicion.descripcion}</div>
                            
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <Label htmlFor={`fecha-${condicion.id}`} className="text-xs font-medium flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span>Fecha de diagnóstico</span>
                                </Label>
                                <Input
                                  id={`fecha-${condicion.id}`}
                                  type="date"
                                  value={condicion.fecha_diagnostico || ""}
                                  onChange={(e) => handleCondicionChange(condicion.id, "fecha_diagnostico", e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                              
                              <div className="space-y-1">
                                <Label htmlFor={`notas-${condicion.id}`} className="text-xs font-medium flex items-center gap-1">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <span>Notas</span>
                                </Label>
                                <Input
                                  id={`notas-${condicion.id}`}
                                  value={condicion.notas || ""}
                                  onChange={(e) => handleCondicionChange(condicion.id, "notas", e.target.value)}
                                  placeholder="Observaciones específicas"
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-dashed rounded-lg">
                        <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground text-sm max-w-xs">
                          No hay condiciones médicas seleccionadas. Añade condiciones médicas relevantes para este paciente.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>Notas Médicas Generales</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Textarea
                        id="notas"
                        value={formData.notas}
                        onChange={handleInputChange}
                        placeholder="Información médica relevante, comentarios o notas adicionales"
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setActiveTab("datos-personales")}>
                    Anterior
                  </Button>
                  <Button onClick={handleSavePatient}>
                    {isEditing ? "Actualizar Paciente" : "Guardar Paciente"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Diálogo para ver detalles del paciente */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedPatient && (
            <>
              <DialogHeader className="pb-4 mb-4 border-b">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 bg-primary/10 text-primary">
                    <AvatarFallback>
                      {getInitials(selectedPatient.primer_nombre, selectedPatient.primer_apellido)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedPatient.primer_nombre} {selectedPatient.primer_apellido} {selectedPatient.segundo_apellido || ''}
                    </DialogTitle>
                    <DialogDescription>
                      Detalles del paciente
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                      <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                        <User className="h-4 w-4 text-primary" />
                        <span>Información Personal</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Nombre completo</p>
                          <p className="font-medium">
                            {selectedPatient.primer_nombre} {selectedPatient.primer_apellido} {selectedPatient.segundo_apellido || ''}
                          </p>
                        </div>
                        
                        {selectedPatient.fecha_nacimiento && (
                          <div>
                            <p className="text-xs text-muted-foreground">Fecha de nacimiento</p>
                            <p className="font-medium flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {formatDate(selectedPatient.fecha_nacimiento)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                      <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                        <Phone className="h-4 w-4 text-primary" />
                        <span>Información de Contacto</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Teléfono</p>
                          <p className="font-medium flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {selectedPatient.telefono}
                          </p>
                        </div>
                        
                        {selectedPatient.email && (
                          <div>
                            <p className="text-xs text-muted-foreground">Correo electrónico</p>
                            <p className="font-medium flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedPatient.email}
                            </p>
                          </div>
                        )}
                        
                        {selectedPatient.direccion && (
                          <div>
                            <p className="text-xs text-muted-foreground">Dirección</p>
                            <p className="font-medium flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {selectedPatient.direccion}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                      <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                        <Stethoscope className="h-4 w-4 text-primary" />
                        <span>Condiciones Médicas</span>
                      </div>
                      
                      {selectedPatient.condiciones && selectedPatient.condiciones.length > 0 ? (
                        <div className="space-y-2">
                          {selectedPatient.condiciones.map((condicion) => (
                            <div 
                              key={condicion.id} 
                              className="p-3 rounded-lg border border-border/60 hover:border-primary/30 transition-colors"
                            >
                              <div className="font-medium text-sm">{condicion.nombre}</div>
                              <div className="text-xs text-muted-foreground mt-1">{condicion.descripcion}</div>
                              
                              {condicion.fecha_diagnostico && (
                                <div className="flex items-center text-xs text-muted-foreground mt-2">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Diagnosticado: {formatDate(condicion.fecha_diagnostico)}
                                </div>
                              )}
                              
                              {condicion.notas && (
                                <div className="text-xs mt-2 p-2 bg-muted/30 rounded">
                                  <span className="font-medium">Notas:</span> {condicion.notas}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-dashed rounded-lg">
                          <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground text-sm max-w-xs">
                            Este paciente no tiene condiciones médicas registradas.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {selectedPatient.notas && (
                      <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                        <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>Notas Médicas</span>
                        </div>
                        
                        <p className="text-sm whitespace-pre-line">{selectedPatient.notas}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    Cerrar
                  </Button>
                  <Button onClick={() => {
                    setIsDetailDialogOpen(false);
                    handleEdit(selectedPatient);
                  }}>
                    Editar Paciente
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pacientes..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                No hay pacientes registrados. Agrega tu primer paciente.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Condiciones Médicas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No se encontraron pacientes con ese criterio de búsqueda
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => (
                      <TableRow 
                        key={patient.id} 
                        className="patient-card cursor-pointer"
                        onClick={() => handleViewDetails(patient)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 bg-primary/10 text-primary">
                              <AvatarFallback>
                                {getInitials(patient.primer_nombre, patient.primer_apellido)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {patient.primer_nombre} {patient.primer_apellido} {patient.segundo_apellido || ''}
                              </div>
                              {patient.fecha_nacimiento && (
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(patient.fecha_nacimiento)}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1.5 text-muted-foreground" />
                              {patient.telefono}
                            </div>
                            {patient.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 mr-1.5 text-muted-foreground" />
                                {patient.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {patient.condiciones && patient.condiciones.length > 0 ? (
                              patient.condiciones.map((condicion) => (
                                <Badge key={condicion.id} variant="outline" className="badge-condition">
                                  {condicion.nombre}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">Ninguna</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(patient);
                              }}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(patient.id);
                              }}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}