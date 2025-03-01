"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, FileText, Loader2, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalPrescriptions: 0,
    recentPrescriptions: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Obtener el total de pacientes
        const { count: patientCount, error: patientError } = await supabase
          .from("pacientes")
          .select("*", { count: "exact", head: true });

        if (patientError) throw patientError;

        setStats({
          totalPatients: patientCount || 0,
          totalPrescriptions: 0, // Pendiente de implementar
          recentPrescriptions: 0, // Pendiente de implementar
          isLoading: false
        });
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido al sistema de gestión de la óptica
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="dashboard-card border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pacientes Totales
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold">{stats.totalPatients}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pacientes registrados en el sistema
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="dashboard-card border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recetas Totales
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPrescriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recetas registradas en el sistema
            </p>
          </CardContent>
        </Card>
        <Card className="dashboard-card border border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Actividad Reciente
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recentPrescriptions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recetas en los últimos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle>Bienvenido a tu Sistema de Gestión</CardTitle>
          <CardDescription>
            Administra pacientes, recetas y más desde un solo lugar
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-medium">Gestión de Pacientes</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Registra y administra la información de tus pacientes, incluyendo sus condiciones médicas.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-medium">Recetas y Prescripciones</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Próximamente: Gestiona recetas y prescripciones para tus pacientes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}