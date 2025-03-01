"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Search, Loader2, Edit, Trash2, X, Calendar, FileText, 
  AlertCircle, User, Eye, Glasses, ArrowRight, Printer
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Tipos para las recetas y detalles
interface Paciente {
  id: string;
  primer_nombre: string;
  primer_apellido: string;
  segundo_apellido: string | null;
  telefono: string;
  email: string | null;
}

interface CondicionMedica {
  id: string;
  nombre: string;
  descripcion: string | null;
  paciente_condicion_id: string;
  fecha_diagnostico?: string | null;
  notas?: string | null;
}

interface DetalleReceta {
  id?: string;
  receta_id?: string;
  tipo_lente: string;
  ojo: string;
  esfera: number | null;
  cilindro: number | null;
  eje: number | null;
  adicion: number | null;
  distancia_pupilar: number | null;
  altura: number | null;
  notas: string | null;
}

interface Receta {
  id: string;
  paciente_id: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  notas: string | null;
  created_at: string;
  paciente?: Paciente;
  detalles?: DetalleReceta[];
  condiciones?: CondicionMedica[];
}

export default function Recetas () {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("informacion");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecetaId, setCurrentRecetaId] = useState<string | null>(null);
  const [pacienteCondiciones, setPacienteCondiciones] = useState<CondicionMedica[]>([]);
  const [selectedCondiciones, setSelectedCondiciones] = useState<string[]>([]);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    paciente_id: "",
    fecha_emision: format(new Date(), "yyyy-MM-dd"),
    fecha_vencimiento: "",
    notas: ""
  });

  const [detallesOjoDerecho, setDetallesOjoDerecho] = useState<DetalleReceta>({
    tipo_lente: "monofocal",
    ojo: "derecho",
    esfera: null,
    cilindro: null,
    eje: null,
    adicion: null,
    distancia_pupilar: null,
    altura: null,
    notas: ""
  });

  const [detallesOjoIzquierdo, setDetallesOjoIzquierdo] = useState<DetalleReceta>({
    tipo_lente: "monofocal",
    ojo: "izquierdo",
    esfera: null,
    cilindro: null,
    eje: null,
    adicion: null,
    distancia_pupilar: null,
    altura: null,
    notas: ""
  });

  // Cargar recetas desde Supabase
  useEffect(() => {
    const fetchRecetas = async () => {
      try {
        const { data, error } = await supabase
          .from("recetas")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          // Para cada receta, obtener paciente, detalles y condiciones
          const recetasCompletas = await Promise.all(
            data.map(async (receta) => {
              // Obtener datos del paciente
              const { data: pacienteData, error: pacienteError } = await supabase
                .from("pacientes")
                .select("id, primer_nombre, primer_apellido, segundo_apellido, telefono, email")
                .eq("id", receta.paciente_id)
                .single();

              if (pacienteError) {
                console.error("Error al cargar paciente:", pacienteError);
              }

              // Obtener detalles de la receta
              const { data: detallesData, error: detallesError } = await supabase
                .from("receta_detalles")
                .select("*")
                .eq("receta_id", receta.id);

              if (detallesError) {
                console.error("Error al cargar detalles:", detallesError);
              }

              // Obtener condiciones médicas asociadas
              const { data: condicionesData, error: condicionesError } = await supabase
                .from("receta_condiciones")
                .select(`
                  paciente_condicion_id,
                  paciente_condiciones (
                    id,
                    fecha_diagnostico,
                    notas,
                    condiciones_medicas (
                      id,
                      nombre,
                      descripcion
                    )
                  )
                `)
                .eq("receta_id", receta.id);

              if (condicionesError) {
                console.error("Error al cargar condiciones:", condicionesError);
              }

              // Transformar los datos de condiciones
              const condiciones = condicionesData?.map(item => ({
                id: item.paciente_condiciones.condiciones_medicas.id,
                nombre: item.paciente_condiciones.condiciones_medicas.nombre,
                descripcion: item.paciente_condiciones.condiciones_medicas.descripcion,
                paciente_condicion_id: item.paciente_condicion_id,
                fecha_diagnostico: item.paciente_condiciones.fecha_diagnostico,
                notas: item.paciente_condiciones.notas
              })) || [];

              return {
                ...receta,
                paciente: pacienteData || undefined,
                detalles: detallesData || [],
                condiciones
              };
            })
          );

          setRecetas(recetasCompletas);
        }
      } catch (error) {
        console.error("Error al cargar recetas:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las recetas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecetas();
  }, [toast]);

  // Cargar pacientes
  useEffect(() => {
    const fetchPacientes = async () => {
      try {
        const { data, error } = await supabase
          .from("pacientes")
          .select("id, primer_nombre, primer_apellido, segundo_apellido, telefono, email")
          .order("primer_apellido");

        if (error) {
          throw error;
        }

        if (data) {
          setPacientes(data);
        }
      } catch (error) {
        console.error("Error al cargar pacientes:", error);
      }
    };

    fetchPacientes();
  }, []);

  // Cargar condiciones médicas del paciente seleccionado
  useEffect(() => {
    const fetchCondicionesPaciente = async () => {
      if (!formData.paciente_id) {
        setPacienteCondiciones([]);
        return;
      }

      try {
        const { data, error } = await supabase
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
          .eq("paciente_id", formData.paciente_id);

        if (error) {
          throw error;
        }

        if (data) {
          const condiciones = data.map(item => ({
            id: item.condiciones_medicas.id,
            nombre: item.condiciones_medicas.nombre,
            descripcion: item.condiciones_medicas.descripcion,
            paciente_condicion_id: item.id,
            fecha_diagnostico: item.fecha_diagnostico,
            notas: item.notas
          }));
          
          setPacienteCondiciones(condiciones);
        }
      } catch (error) {
        console.error("Error al cargar condiciones del paciente:", error);
      }
    };

    fetchCondicionesPaciente();
  }, [formData.paciente_id]);

  // Manejar cambios en el formulario principal
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Manejar cambios en los detalles de la receta (ojo derecho)
  const handleDetalleOjoDerechoChange = (field: string, value: any) => {
    setDetallesOjoDerecho(prev => ({ ...prev, [field]: value }));
  };

  // Manejar cambios en los detalles de la receta (ojo izquierdo)
  const handleDetalleOjoIzquierdoChange = (field: string, value: any) => {
    setDetallesOjoIzquierdo(prev => ({ ...prev, [field]: value }));
  };

  // Manejar selección/deselección de condiciones médicas
  const handleCondicionToggle = (condicionId: string) => {
    setSelectedCondiciones(prev => {
      if (prev.includes(condicionId)) {
        return prev.filter(id => id !== condicionId);
      } else {
        return [...prev, condicionId];
      }
    });
  };

  // Resetear el formulario
  const resetForm = () => {
    setFormData({
      paciente_id: "",
      fecha_emision: format(new Date(), "yyyy-MM-dd"),
      fecha_vencimiento: "",
      notas: ""
    });
    
    setDetallesOjoDerecho({
      tipo_lente: "monofocal",
      ojo: "derecho",
      esfera: null,
      cilindro: null,
      eje: null,
      adicion: null,
      distancia_pupilar: null,
      altura: null,
      notas: ""
    });
    
    setDetallesOjoIzquierdo({
      tipo_lente: "monofocal",
      ojo: "izquierdo",
      esfera: null,
      cilindro: null,
      eje: null,
      adicion: null,
      distancia_pupilar: null,
      altura: null,
      notas: ""
    });
    
    setSelectedCondiciones([]);
    setActiveTab("informacion");
    setIsEditing(false);
    setCurrentRecetaId(null);
  };

  // Abrir diálogo para editar
  const handleEdit = (receta: Receta) => {
    setFormData({
      paciente_id: receta.paciente_id,
      fecha_emision: receta.fecha_emision,
      fecha_vencimiento: receta.fecha_vencimiento || "",
      notas: receta.notas || ""
    });
    
    // Establecer detalles de la receta
    if (receta.detalles && receta.detalles.length > 0) {
      const ojoDerecho = receta.detalles.find(d => d.ojo === "derecho");
      const ojoIzquierdo = receta.detalles.find(d => d.ojo === "izquierdo");
      
      if (ojoDerecho) {
        setDetallesOjoDerecho({
          ...ojoDerecho,
          tipo_lente: ojoDerecho.tipo_lente || "monofocal",
          notas: ojoDerecho.notas || ""
        });
      }
      
      if (ojoIzquierdo) {
        setDetallesOjoIzquierdo({
          ...ojoIzquierdo,
          tipo_lente: ojoIzquierdo.tipo_lente || "monofocal",
          notas: ojoIzquierdo.notas || ""
        });
      }
    }
    
    // Establecer condiciones médicas seleccionadas
    if (receta.condiciones && receta.condiciones.length > 0) {
      setSelectedCondiciones(receta.condiciones.map(c => c.paciente_condicion_id));
    } else {
      setSelectedCondiciones([]);
    }
    
    setIsEditing(true);
    setCurrentRecetaId(receta.id);
    setIsDialogOpen(true);
  };

  // Abrir diálogo para ver detalles
  const handleViewDetails = (receta: Receta) => {
    setSelectedReceta(receta);
    setIsDetailDialogOpen(true);
  };

  // Eliminar receta
  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar esta receta?")) {
      try {
        const { error } = await supabase
          .from("recetas")
          .delete()
          .eq("id", id);

        if (error) {
          throw error;
        }

        setRecetas(recetas.filter(receta => receta.id !== id));
        toast({
          title: "Receta eliminada",
          description: "La receta ha sido eliminada correctamente",
        });
      } catch (error) {
        console.error("Error al eliminar receta:", error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la receta",
          variant: "destructive",
        });
      }
    }
  };

  // Guardar receta
  const handleSaveReceta = async () => {
    try {
      // Validar campos requeridos
      if (!formData.paciente_id || !formData.fecha_emision) {
        toast({
          title: "Error",
          description: "Por favor completa los campos obligatorios",
          variant: "destructive",
        });
        return;
      }

      let recetaId = currentRecetaId;
      
      if (isEditing && currentRecetaId) {
        // Actualizar receta existente
        const { data, error } = await supabase
          .from("recetas")
          .update({
            paciente_id: formData.paciente_id,
            fecha_emision: formData.fecha_emision,
            fecha_vencimiento: formData.fecha_vencimiento || null,
            notas: formData.notas || null
          })
          .eq("id", currentRecetaId)
          .select();

        if (error) {
          throw error;
        }
      } else {
        // Crear nueva receta
        const { data, error } = await supabase
          .from("recetas")
          .insert({
            paciente_id: formData.paciente_id,
            fecha_emision: formData.fecha_emision,
            fecha_vencimiento: formData.fecha_vencimiento || null,
            notas: formData.notas || null
          })
          .select();

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          recetaId = data[0].id;
        }
      }

      // Si tenemos un ID de receta, actualizar sus detalles
      if (recetaId) {
        // 1. Si estamos editando, eliminar los detalles existentes
        if (isEditing) {
          const { error: deleteDetallesError } = await supabase
            .from("receta_detalles")
            .delete()
            .eq("receta_id", recetaId);
          
          if (deleteDetallesError) {
            console.error("Error al eliminar detalles existentes:", deleteDetallesError);
          }
          
          const { error: deleteCondicionesError } = await supabase
            .from("receta_condiciones")
            .delete()
            .eq("receta_id", recetaId);
          
          if (deleteCondicionesError) {
            console.error("Error al eliminar condiciones existentes:", deleteCondicionesError);
          }
        }
        
        // 2. Insertar los nuevos detalles
        const detallesInsert = [];
        
        // Ojo derecho
        if (detallesOjoDerecho.esfera !== null || detallesOjoDerecho.cilindro !== null || detallesOjoDerecho.eje !== null) {
          detallesInsert.push({
            receta_id: recetaId,
            tipo_lente: detallesOjoDerecho.tipo_lente,
            ojo: "derecho",
            esfera: detallesOjoDerecho.esfera,
            cilindro: detallesOjoDerecho.cilindro,
            eje: detallesOjoDerecho.eje,
            adicion: detallesOjoDerecho.adicion,
            distancia_pupilar: detallesOjoDerecho.distancia_pupilar,
            altura: detallesOjoDerecho.altura,
            notas: detallesOjoDerecho.notas || null
          });
        }
        
        // Ojo izquierdo
        if (detallesOjoIzquierdo.esfera !== null || detallesOjoIzquierdo.cilindro !== null || detallesOjoIzquierdo.eje !== null) {
          detallesInsert.push({
            receta_id: recetaId,
            tipo_lente: detallesOjoIzquierdo.tipo_lente,
            ojo: "izquierdo",
            esfera: detallesOjoIzquierdo.esfera,
            cilindro: detallesOjoIzquierdo.cilindro,
            eje: detallesOjoIzquierdo.eje,
            adicion: detallesOjoIzquierdo.adicion,
            distancia_pupilar: detallesOjoIzquierdo.distancia_pupilar,
            altura: detallesOjoIzquierdo.altura,
            notas: detallesOjoIzquierdo.notas || null
          });
        }
        
        if (detallesInsert.length > 0) {
          const { error: insertDetallesError } = await supabase
            .from("receta_detalles")
            .insert(detallesInsert);
          
          if (insertDetallesError) {
            console.error("Error al insertar detalles:", insertDetallesError);
          }
        }
        
        // 3. Insertar las condiciones médicas seleccionadas
        if (selectedCondiciones.length > 0) {
          const condicionesInsert = selectedCondiciones.map(condicionId => ({
            receta_id: recetaId,
            paciente_condicion_id: condicionId
          }));
          
          const { error: insertCondicionesError } = await supabase
            .from("receta_condiciones")
            .insert(condicionesInsert);
          
          if (insertCondicionesError) {
            console.error("Error al insertar condiciones:", insertCondicionesError);
          }
        }
      }

      // Actualizar la lista de recetas
      const { data: updatedReceta, error: fetchError } = await supabase
        .from("recetas")
        .select("*")
        .eq("id", recetaId)
        .single();
      
      if (fetchError) {
        console.error("Error al obtener receta actualizada:", fetchError);
      } else if (updatedReceta) {
        // Obtener datos del paciente
        const { data: pacienteData, error: pacienteError } = await supabase
          .from("pacientes")
          .select("id, primer_nombre, primer_apellido, segundo_apellido, telefono, email")
          .eq("id", updatedReceta.paciente_id)
          .single();
        
        if (pacienteError) {
          console.error("Error al obtener paciente:", pacienteError);
        }
        
        // Obtener detalles de la receta
        const { data: detallesData, error: detallesError } = await supabase
          .from("receta_detalles")
          .select("*")
          .eq("receta_id", recetaId);
        
        if (detallesError) {
          console.error("Error al obtener detalles:", detallesError);
        }
        
        // Obtener condiciones médicas
        const { data: condicionesData, error: condicionesError } = await supabase
          .from("receta_condiciones")
          .select(`
            paciente_condicion_id,
            paciente_condiciones (
              id,
              fecha_diagnostico,
              notas,
              condiciones_medicas (
                id,
                nombre,
                descripcion
              )
            )
          `)
          .eq("receta_id", recetaId);
        
        if (condicionesError) {
          console.error("Error al obtener condiciones:", condicionesError);
        }
        
        // Transformar los datos de condiciones
        const condiciones = condicionesData?.map(item => ({
          id: item.paciente_condiciones.condiciones_medicas.id,
          nombre: item.paciente_condiciones.condiciones_medicas.nombre,
          descripcion: item.paciente_condiciones.condiciones_medicas.descripcion,
          paciente_condicion_id: item.paciente_condicion_id,
          fecha_diagnostico: item.paciente_condiciones.fecha_diagnostico,
          notas: item.paciente_condiciones.notas
        })) || [];
        
        const recetaCompleta = {
          ...updatedReceta,
          paciente: pacienteData || undefined,
          detalles: detallesData || [],
          condiciones
        };
        
        if (isEditing) {
          setRecetas(recetas.map(r => r.id === recetaId ? recetaCompleta : r));
          toast({
            title: "Receta actualizada",
            description: "La receta ha sido actualizada correctamente",
          });
        } else {
          setRecetas([recetaCompleta, ...recetas]);
          toast({
            title: "Receta agregada",
            description: "La receta ha sido agregada correctamente",
          });
        }
      }

      // Cerrar diálogo y resetear formulario
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar receta:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la receta",
        variant: "destructive",
      });
    }
  };

  // Filtrar recetas según término de búsqueda
  const filteredRecetas = recetas.filter(
    (receta) =>
      (receta.paciente && receta.paciente.primer_nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (receta.paciente && receta.paciente.primer_apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (receta.paciente && receta.paciente.segundo_apellido && receta.paciente.segundo_apellido.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (receta.condiciones && receta.condiciones.some(c => c.nombre.toLowerCase().includes(searchTerm.toLowerCase())))
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

  // Formatear valores numéricos para mostrar
  const formatValue = (value: number | null) => {
    if (value === null) return "-";
    return value > 0 ? `+${value}` : `${value}`;
  };

  // Obtener iniciales para el avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recetas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las recetas de tus pacientes
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Receta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 mb-2 border-b">
              <DialogTitle className="text-xl">
                {isEditing ? "Editar Receta" : "Agregar Nueva Receta"}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Modifica los datos de la receta" : "Ingresa los datos de la nueva receta"}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="informacion" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Información Básica
                </TabsTrigger>
                <TabsTrigger value="prescripcion" className="gap-2">
                  <Glasses className="h-4 w-4" />
                  Prescripción
                </TabsTrigger>
                <TabsTrigger value="condiciones" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Condiciones
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="informacion" className="space-y-4 py-2">
                <div className="space-y-4">
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <User className="h-4 w-4 text-primary" />
                      <span>Paciente</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="paciente_id" className="text-sm font-medium flex items-center gap-1.5">
                        <span>Seleccionar Paciente</span>
                        <span className="text-primary ml-0.5">*</span>
                      </Label>
                      <Select 
                        value={formData.paciente_id} 
                        onValueChange={(value) => setFormData({...formData, paciente_id: value})}
                      >
                        <SelectTrigger id="paciente_id" className="w-full">
                          <SelectValue placeholder="Seleccionar paciente" />
                        </SelectTrigger>
                        <SelectContent>
                          {pacientes.map((paciente) => (
                            <SelectItem key={paciente.id} value={paciente.id}>
                              {paciente.primer_nombre} {paciente.primer_apellido} {paciente.segundo_apellido || ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>Fechas</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fecha_emision" className="text-sm font-medium flex items-center gap-1.5">
                          <span>Fecha de Emisión</span>
                          <span className="text-primary ml-0.5">*</span>
                        </Label>
                        <Input
                          id="fecha_emision"
                          type="date"
                          value={formData.fecha_emision}
                          onChange={handleInputChange}
                          className="w-full"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="fecha_vencimiento" className="text-sm font-medium flex items-center gap-1.5">
                          <span>Fecha de Vencimiento</span>
                        </Label>
                        <Input
                          id="fecha_vencimiento"
                          type="date"
                          value={formData.fecha_vencimiento}
                          onChange={handleInputChange}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <FileText className="h-4 w-4 text-primary" />
                      <span>Notas Adicionales</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Textarea
                        id="notas"
                        value={formData.notas}
                        onChange={handleInputChange}
                        placeholder="Observaciones o indicaciones adicionales"
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setActiveTab("prescripcion")}>
                    Siguiente
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="prescripcion" className="space-y-4 py-2">
                <div className="space-y-4">
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <Glasses className="h-4 w-4 text-primary" />
                      <span>Tipo de Lente</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipo_lente_od" className="text-sm font-medium">
                          Ojo Derecho (OD)
                        </Label>
                        <Select 
                          value={detallesOjoDerecho.tipo_lente} 
                          onValueChange={(value) => handleDetalleOjoDerechoChange("tipo_lente", value)}
                        >
                          <SelectTrigger id="tipo_lente_od">
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monofocal">Monofocal</SelectItem>
                            <SelectItem value="bifocal">Bifocal</SelectItem>
                            <SelectItem value="progresivo">Progresivo</SelectItem>
                            <SelectItem value="ocupacional">Ocupacional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="tipo_lente_oi" className="text-sm font-medium">
                          Ojo Izquierdo (OI)
                        </Label>
                        <Select 
                          value={detallesOjoIzquierdo.tipo_lente} 
                          onValueChange={(value) => handleDetalleOjoIzquierdoChange("tipo_lente", value)}
                        >
                          <SelectTrigger id="tipo_lente_oi">
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monofocal">Monofocal</SelectItem>
                            <SelectItem value="bifocal">Bifocal</SelectItem>
                            <SelectItem value="progresivo">Progresivo</SelectItem>
                            <SelectItem value="ocupacional">Ocupacional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ojo Derecho */}
                    <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                      <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                        <Eye className="h-4 w-4 text-primary" />
                        <span>Ojo Derecho (OD)</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="esfera_od" className="text-xs font-medium">
                              Esfera
                            </Label>
                            <Input
                              id="esfera_od"
                              type="number"
                              step="0.25"
                              value={detallesOjoDerecho.esfera === null ? "" : detallesOjoDerecho.esfera}
                              onChange={(e) => handleDetalleOjoDerechoChange("esfera", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="+/-0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="cilindro_od" className="text-xs font-medium">
                              Cilindro
                            </Label>
                            <Input
                              id="cilindro_od"
                              type="number"
                              step="0.25"
                              value={detallesOjoDerecho.cilindro === null ? "" : detallesOjoDerecho.cilindro}
                              onChange={(e) => handleDetalleOjoDerechoChange("cilindro", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="+/-0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="eje_od" className="text-xs font-medium">
                              Eje
                            </Label>
                            <Input
                              id="eje_od"
                              type="number"
                              min="0"
                              max="180"
                              value={detallesOjoDerecho.eje === null ? "" : detallesOjoDerecho.eje}
                              onChange={(e) => handleDetalleOjoDerechoChange("eje", e.target.value === "" ? null : parseInt(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="0-180"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="adicion_od" className="text-xs font-medium">
                              Adición
                            </Label>
                            <Input
                              id="adicion_od"
                              type="number"
                              step="0.25"
                              value={detallesOjoDerecho.adicion === null ? "" : detallesOjoDerecho.adicion}
                              onChange={(e) => handleDetalleOjoDerechoChange("adicion", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="+0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="dp_od" className="text-xs font-medium">
                              Dist. Pupilar
                            </Label>
                            <Input
                              id="dp_od"
                              type="number"
                              step="0.5"
                              value={detallesOjoDerecho.distancia_pupilar === null ? "" : detallesOjoDerecho.distancia_pupilar}
                              onChange={(e) => handleDetalleOjoDerechoChange("distancia_pupilar", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="mm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="altura_od" className="text-xs font-medium">
                            Altura
                          </Label>
                          <Input
                            id="altura_od"
                            type="number"
                            step="0.5"
                            value={detallesOjoDerecho.altura === null ? "" : detallesOjoDerecho.altura}
                            onChange={(e) => handleDetalleOjoDerechoChange("altura", e.target.value === "" ? null : parseFloat(e.target.value))}
                            className="h-8 text-xs"
                            placeholder="mm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="notas_od" className="text-xs font-medium">
                            Notas
                          </Label>
                          <Input
                            id="notas_od"
                            value={detallesOjoDerecho.notas || ""}
                            onChange={(e) => handleDetalleOjoDerechoChange("notas", e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Observaciones específicas"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Ojo Izquierdo */}
                    <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                      <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                        <Eye className="h-4 w-4 text-primary" />
                        <span>Ojo Izquierdo (OI)</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="esfera_oi" className="text-xs font-medium">
                              Esfera
                            </Label>
                            <Input
                              id="esfera_oi"
                              type="number"
                              step="0.25"
                              value={detallesOjoIzquierdo.esfera === null ? "" : detallesOjoIzquierdo.esfera}
                              onChange={(e) => handleDetalleOjoIzquierdoChange("esfera", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="+/-0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="cilindro_oi" className="text-xs font-medium">
                              Cilindro
                            </Label>
                            <Input
                              id="cilindro_oi"
                              type="number"
                              step="0.25"
                              value={detallesOjoIzquierdo.cilindro === null ? "" : detallesOjoIzquierdo.cilindro}
                              onChange={(e) => handleDetalleOjoIzquierdoChange("cilindro", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="+/-0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="eje_oi" className="text-xs font-medium">
                              Eje
                            </Label>
                            <Input
                              id="eje_oi"
                              type="number"
                              min="0"
                              max="180"
                              value={detallesOjoIzquierdo.eje === null ? "" : detallesOjoIzquierdo.eje}
                              onChange={(e) => handleDetalleOjoIzquierdoChange("eje", e.target.value === "" ? null : parseInt(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="0-180"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="adicion_oi" className="text-xs font-medium">
                              Adición
                            </Label>
                            <Input
                              id="adicion_oi"
                              type="number"
                              step="0.25"
                              value={detallesOjoIzquierdo.adicion === null ? "" : detallesOjoIzquierdo.adicion}
                              onChange={(e) => handleDetalleOjoIzquierdoChange("adicion", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="+0.00"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="dp_oi" className="text-xs font-medium">
                              Dist. Pupilar
                            </Label>
                            <Input
                              id="dp_oi"
                              type="number"
                              step="0.5"
                              value={detallesOjoIzquierdo.distancia_pupilar === null ? "" : detallesOjoIzquierdo.distancia_pupilar}
                              onChange={(e) => handleDetalleOjoIzquierdoChange("distancia_pupilar", e.target.value === "" ? null : parseFloat(e.target.value))}
                              className="h-8 text-xs"
                              placeholder="mm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="altura_oi" className="text-xs font-medium">
                            Altura
                          </Label>
                          <Input
                            id="altura_oi"
                            type="number"
                            step="0.5"
                            value={detallesOjoIzquierdo.altura === null ? "" : detallesOjoIzquierdo.altura}
                            onChange={(e) => handleDetalleOjoIzquierdoChange("altura", e.target.value === "" ? null : parseFloat(e.target.value))}
                            className="h-8 text-xs"
                            placeholder="mm"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="notas_oi" className="text-xs font-medium">
                            Notas
                          </Label>
                          <Input
                            id="notas_oi"
                            value={detallesOjoIzquierdo.notas || ""}
                            onChange={(e) => handleDetalleOjoIzquierdoChange("notas", e.target.value)}
                            className="h-8 text-xs"
                            placeholder="Observaciones específicas"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setActiveTab("informacion")}>
                    Anterior
                  </Button>
                  <Button onClick={() => setActiveTab("condiciones")}>
                    Siguiente
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="condiciones" className="space-y-4 py-2">
                <div className="space-y-4">
                  <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                    <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <span>Condiciones Médicas Asociadas</span>
                    </div>
                    
                    {formData.paciente_id ? (
                      pacienteCondiciones.length > 0 ? (
                        <div className="space-y-2">
                          {pacienteCondiciones.map((condicion) => (
                            <div 
                              key={condicion.paciente_condicion_id} 
                              className="flex items-start p-3 rounded-lg border border-border/60 hover:border-primary/30 transition-colors"
                            >
                              <div className="flex items-center h-5 mr-3">
                                <input
                                  type="checkbox"
                                  id={`condicion-${condicion.paciente_condicion_id}`}
                                  checked={selectedCondiciones.includes(condicion.paciente_condicion_id)}
                                  onChange={() => handleCondicionToggle(condicion.paciente_condicion_id)}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <label 
                                  htmlFor={`condicion-${condicion.paciente_condicion_id}`}
                                  className="font-medium text-sm cursor-pointer"
                                >
                                  {condicion.nombre}
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {condicion.descripcion}
                                </p>
                                {condicion.fecha_diagnostico && (
                                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    Diagnosticado: {formatDate(condicion.fecha_diagnostico)}
                                  </div>
                                )}
                 </div>
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
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 px-4 text-center border border-dashed rounded-lg">
                        <User className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground text-sm max-w-xs">
                          Selecciona un paciente en la pestaña de información básica para ver sus condiciones médicas.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setActiveTab("prescripcion")}>
                    Anterior
                  </Button>
                  <Button onClick={handleSaveReceta}>
                    {isEditing ? "Actualizar Receta" : "Guardar Receta"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Diálogo para ver detalles de la receta */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReceta && (
            <>
              <DialogHeader className="pb-4 mb-4 border-b">
                <div className="flex items-center gap-4">
                  {selectedReceta.paciente && (
                    <Avatar className="h-12 w-12 bg-primary/10 text-primary">
                      <AvatarFallback>
                        {getInitials(selectedReceta.paciente.primer_nombre, selectedReceta.paciente.primer_apellido)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <DialogTitle className="text-xl">
                      Receta {selectedReceta.paciente ? `de ${selectedReceta.paciente.primer_nombre} ${selectedReceta.paciente.primer_apellido}` : ''}
                    </DialogTitle>
                    <DialogDescription>
                      Emitida el {formatDate(selectedReceta.fecha_emision)}
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
                        <span>Información del Paciente</span>
                      </div>
                      
                      {selectedReceta.paciente ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Nombre completo</p>
                            <p className="font-medium">
                              {selectedReceta.paciente.primer_nombre} {selectedReceta.paciente.primer_apellido} {selectedReceta.paciente.segundo_apellido || ''}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Teléfono</p>
                            <p className="font-medium">
                              {selectedReceta.paciente.telefono}
                            </p>
                          </div>
                          
                          {selectedReceta.paciente.email && (
                            <div>
                              <p className="text-xs text-muted-foreground">Correo electrónico</p>
                              <p className="font-medium">
                                {selectedReceta.paciente.email}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Información del paciente no disponible
                        </p>
                      )}
                    </div>
                    
                    <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                      <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>Fechas</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Fecha de emisión</p>
                          <p className="font-medium">
                            {formatDate(selectedReceta.fecha_emision)}
                          </p>
                        </div>
                        
                        {selectedReceta.fecha_vencimiento && (
                          <div>
                            <p className="text-xs text-muted-foreground">Fecha de vencimiento</p>
                            <p className="font-medium">
                              {formatDate(selectedReceta.fecha_vencimiento)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedReceta.condiciones && selectedReceta.condiciones.length > 0 && (
                      <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                        <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          <span>Condiciones Médicas</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                          {selectedReceta.condiciones.map((condicion) => (
                            <Badge key={condicion.paciente_condicion_id} variant="outline" className="badge-condition">
                              {condicion.nombre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                      <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                        <Glasses className="h-4 w-4 text-primary" />
                        <span>Prescripción</span>
                      </div>
                      
                      {selectedReceta.detalles && selectedReceta.detalles.length > 0 ? (
                        <div className="space-y-4">
                          {/* Tabla de prescripción */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 font-medium text-xs text-muted-foreground">Ojo</th>
                                  <th className="text-center py-2 font-medium text-xs text-muted-foreground">Esfera</th>
                                  <th className="text-center py-2 font-medium text-xs text-muted-foreground">Cilindro</th>
                                  <th className="text-center py-2 font-medium text-xs text-muted-foreground">Eje</th>
                                  <th className="text-center py-2 font-medium text-xs text-muted-foreground">Adición</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedReceta.detalles.find(d => d.ojo === "derecho") && (
                                  <tr className="border-b">
                                    <td className="py-2 font-medium">OD</td>
                                    <td className="py-2 text-center">{formatValue(selectedReceta.detalles.find(d => d.ojo === "derecho")?.esfera || null)}</td>
                                    <td className="py-2 text-center">{formatValue(selectedReceta.detalles.find(d => d.ojo === "derecho")?.cilindro || null)}</td>
                                    <td className="py-2 text-center">{selectedReceta.detalles.find(d => d.ojo === "derecho")?.eje || "-"}</td>
                                    <td className="py-2 text-center">{formatValue(selectedReceta.detalles.find(d => d.ojo === "derecho")?.adicion || null)}</td>
                                  </tr>
                                )}
                                {selectedReceta.detalles.find(d => d.ojo === "izquierdo") && (
                                  <tr>
                                    <td className="py-2 font-medium">OI</td>
                                    <td className="py-2 text-center">{formatValue(selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.esfera || null)}</td>
                                    <td className="py-2 text-center">{formatValue(selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.cilindro || null)}</td>
                                    <td className="py-2 text-center">{selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.eje || "-"}</td>
                                    <td className="py-2 text-center">{formatValue(selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.adicion || null)}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Información adicional */}
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Tipo de lente OD</p>
                              <p className="font-medium capitalize">
                                {selectedReceta.detalles.find(d => d.ojo === "derecho")?.tipo_lente || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Tipo de lente OI</p>
                              <p className="font-medium capitalize">
                                {selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.tipo_lente || "-"}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Distancia pupilar OD</p>
                              <p className="font-medium">
                                {selectedReceta.detalles.find(d => d.ojo === "derecho")?.distancia_pupilar || "-"} {selectedReceta.detalles.find(d => d.ojo === "derecho")?.distancia_pupilar ? "mm" : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Distancia pupilar OI</p>
                              <p className="font-medium">
                                {selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.distancia_pupilar || "-"} {selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.distancia_pupilar ? "mm" : ""}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Altura OD</p>
                              <p className="font-medium">
                                {selectedReceta.detalles.find(d => d.ojo === "derecho")?.altura || "-"} {selectedReceta.detalles.find(d => d.ojo === "derecho")?.altura ? "mm" : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Altura OI</p>
                              <p className="font-medium">
                                {selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.altura || "-"} {selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.altura ? "mm" : ""}
                              </p>
                            </div>
                          </div>
                          
                          {/* Notas específicas por ojo */}
                          {(selectedReceta.detalles.find(d => d.ojo === "derecho")?.notas || selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.notas) && (
                            <div className="mt-4 space-y-3">
                              {selectedReceta.detalles.find(d => d.ojo === "derecho")?.notas && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Notas OD</p>
                                  <p className="text-sm">
                                    {selectedReceta.detalles.find(d => d.ojo === "derecho")?.notas}
                                  </p>
                                </div>
                              )}
                              
                              {selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.notas && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Notas OI</p>
                                  <p className="text-sm">
                                    {selectedReceta.detalles.find(d => d.ojo === "izquierdo")?.notas}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No hay detalles de prescripción disponibles
                        </p>
                      )}
                    </div>
                    
                    {selectedReceta.notas && (
                      <div className="form-section p-4 rounded-lg border border-border/60 bg-card">
                        <div className="form-section-title text-sm font-medium flex items-center gap-2 mb-3 pb-2 border-b">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>Notas Adicionales</span>
                        </div>
                        
                        <p className="text-sm whitespace-pre-line">{selectedReceta.notas}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                    Cerrar
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        // Aquí iría la lógica para imprimir la receta
                        toast({
                          title: "Función en desarrollo",
                          description: "La impresión de recetas estará disponible próximamente",
                        });
                      }}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button onClick={() => {
                      setIsDetailDialogOpen(false);
                      handleEdit(selectedReceta);
                    }}>
                      Editar Receta
                    </Button>
                  </div>
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
                placeholder="Buscar recetas..."
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
          ) : recetas.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                No hay recetas registradas. Agrega tu primera receta.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Prescripción</TableHead>
                    <TableHead>Condiciones</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecetas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No se encontraron recetas con ese criterio de búsqueda
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecetas.map((receta) => (
                      <TableRow 
                        key={receta.id} 
                        className="patient-card cursor-pointer"
                        onClick={() => handleViewDetails(receta)}
                      >
                        <TableCell>
                          {receta.paciente ? (
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 bg-primary/10 text-primary">
                                <AvatarFallback>
                                  {getInitials(receta.paciente.primer_nombre, receta.paciente.primer_apellido)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="font-medium">
                                {receta.paciente.primer_nombre} {receta.paciente.primer_apellido} {receta.paciente.segundo_apellido || ''}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Paciente no disponible</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                              {formatDate(receta.fecha_emision)}
                            </div>
                            {receta.fecha_vencimiento && (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <span className="ml-5">Vence: {formatDate(receta.fecha_vencimiento)}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {receta.detalles && receta.detalles.length > 0 ? (
                              <>
                                {receta.detalles.find(d => d.ojo === "derecho") && (
                                  <div className="text-xs">
                                    <span className="font-medium">OD:</span> {formatValue(receta.detalles.find(d => d.ojo === "derecho")?.esfera || null)} / {formatValue(receta.detalles.find(d => d.ojo === "derecho")?.cilindro || null)} / {receta.detalles.find(d => d.ojo === "derecho")?.eje || "-"}
                                  </div>
                                )}
                                {receta.detalles.find(d => d.ojo === "izquierdo") && (
                                  <div className="text-xs">
                                    <span className="font-medium">OI:</span> {formatValue(receta.detalles.find(d => d.ojo === "izquierdo")?.esfera || null)} / {formatValue(receta.detalles.find(d => d.ojo === "izquierdo")?.cilindro || null)} / {receta.detalles.find(d => d.ojo === "izquierdo")?.eje || "-"}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground text-xs">Sin detalles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {receta.condiciones && receta.condiciones.length > 0 ? (
                              receta.condiciones.map((condicion) => (
                                <Badge key={condicion.paciente_condicion_id} variant="outline" className="badge-condition">
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
                                handleEdit(receta);
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
                                handleDelete(receta.id);
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