import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Header from "./Header";
import "../styles/Dashboard.css"; // Asegúrate de que este CSS esté actualizado
import Footer from "./Footer";
import { LayoutDashboard, Loader, AlertCircle } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

// Base URL para asegurar consistencia
const API_BASE_URL = "https://buhovialws.mendoza.gov.ar/api";

function Dashboard({ userName, onLogout }) {
    // --- ESTADOS PARA OBRAS EN EJECUCIÓN ---
    const [totalEjecucion, setTotalEjecucion] = useState(0);
    const [porZonaEjecucion, setPorZonaEjecucion] = useState([]);

    // --- ESTADOS PARA OBRAS FINALIZADAS (Nuevos) ---
    const [totalFinalizadas, setTotalFinalizadas] = useState(0);
    const [porZonaFinalizadas, setPorZonaFinalizadas] = useState([]);

    // --- ESTADOS DE UI ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Colores consistentes y profesionales (puedes ajustar estos)
    const chartColors = ["#10B981", "#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#06B6D4"];

    // --- FUNCIÓN DE CARGA DE DATOS ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                // Carga de datos paralela (4 peticiones)
                const [ejecTotalRes, ejecZonaRes, finTotalRes, finZonaRes] =
                    await Promise.all([
                        fetch(`${API_BASE_URL}/ObraProyecto/total-ejecucion`),
                        fetch(`${API_BASE_URL}/ObraProyecto/por-zona-ejecucion`),
                        fetch(`${API_BASE_URL}/ObraProyecto/total-finalizadas`),
                        fetch(`${API_BASE_URL}/ObraProyecto/por-zona-finalizadas`),
                    ]);

                // Manejo de respuestas de Ejecución
                if (!ejecTotalRes.ok || !ejecZonaRes.ok)
                    throw new Error(`Fallo al obtener datos de obras en ejecución.`);
                setTotalEjecucion((await ejecTotalRes.json()).total || 0);
                setPorZonaEjecucion(await ejecZonaRes.json());

                // Manejo de respuestas de Finalizadas
                if (!finTotalRes.ok || !finZonaRes.ok)
                    throw new Error(`Fallo al obtener datos de obras finalizadas.`);
                setTotalFinalizadas((await finTotalRes.json()).total || 0);
                setPorZonaFinalizadas(await finZonaRes.json());
            } catch (err) {
                console.error("Error cargando Dashboard:", err);
                setError(err.message || "Error de conexión con el servidor.");
                setTotalEjecucion(0);
                setPorZonaEjecucion([]);
                setTotalFinalizadas(0);
                setPorZonaFinalizadas([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Lógica del Gráfico en EJECUCIÓN ---
    const dataEjecucion = {
        labels: porZonaEjecucion.map((z) => z.zona),
        datasets: [
            {
                data: porZonaEjecucion.map((z) => z.cantidad),
                backgroundColor: chartColors.slice(0, porZonaEjecucion.length), // Asegura que solo se usen los colores necesarios
                hoverBackgroundColor: porZonaEjecucion.map((_, i) => `${chartColors[i]}CC`), // Un hover más sutil
                borderWidth: 0, // Remover el borde blanco para un look más limpio
            },
        ],
    };

    // --- Lógica del Gráfico FINALIZADAS ---
    const dataFinalizadas = {
        labels: porZonaFinalizadas.map((z) => z.zona),
        datasets: [
            {
                data: porZonaFinalizadas.map((z) => z.cantidad),
                backgroundColor: chartColors.slice(0, porZonaFinalizadas.length),
                hoverBackgroundColor: porZonaFinalizadas.map((_, i) => `${chartColors[i]}CC`),
                borderWidth: 0,
            },
        ],
    };

    const options = {
        cutout: "80%", // Aumento del corte para un anillo más delgado y elegante
        responsive: true,
        maintainAspectRatio: false, // Permitir que el CSS controle el tamaño
        plugins: {
            legend: {
                position: "bottom", // Mover leyenda abajo para más espacio en el gráfico
                labels: { 
                    boxWidth: 15, 
                    padding: 20,
                    font: { size: 14 } // Tipografía más legible
                },
            },
            tooltip: {
                callbacks: {
                    // Mostrar porcentaje y cantidad en el tooltip
                    label: ({ label, raw, total }) => {
                        const percentage = ((raw / total) * 100).toFixed(1);
                        return `${label}`;
                    },
                },
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { weight: 'bold' }
            },
        },
    };

    if (loading) {
        return (
            <div className="dashboard loading">
                <Header nombreUsuario={userName} onLogout={onLogout} />
                <main className="dashboard-content">
                    <Loader className="spinner" size={40} color="#3B82F6"/>
                    <p>Cargando datos del Dashboard... 🔄</p>
                </main>
                <Footer />
            </div>
        );
    }

    if (error) {
        return (
            <>
                <Header nombreUsuario={userName} onLogout={onLogout} />
                <div className="dashboard error">
                    <main className="dashboard-content">
                        <h2><AlertCircle color="red"/> Obras DPV - Error</h2>
                        <p style={{ color: "red", fontWeight: "bold" }}>Error: {error}</p>
                        <p>No se pudieron cargar los gráficos. Verifique la conexión con el backend.</p>
                    </main>
                </div>
                <Footer />
            </>
        );
    }

    // Componente auxiliar para renderizar el gráfico
    const ChartCard = ({ title, total, data }) => (
        <div className="stat-card">
            <h3>{title}</h3>
            <p className="total-display">
                Total obras: <strong>{total}</strong>
            </p>
            {total > 0 ? (
                <div className="chart-container">
                    <Doughnut data={data} options={options} />
                    <div className="chart-center">
                        <span>{total}</span>
                    </div>
                </div>
            ) : (
                <div className="no-data-message">
                    <p>No hay obras {title.toLowerCase().includes("ejecución") ? "en ejecución" : "finalizadas"} para mostrar.</p>
                </div>
            )}
        </div>
    );


    return (
        <>
            <Header nombreUsuario={userName} onLogout={onLogout} />
            <div className="dashboard">
                <h2><LayoutDashboard size={32} style={{verticalAlign: 'middle', marginRight: '10px'}}/> Dashboard de Obras DPV</h2>
                <main className="dashboard-content">
                    
                    {/* GRÁFICO 1: OBRAS EN EJECUCIÓN (usando ChartCard) */}
                    <ChartCard 
                        title="Obras en Ejecución por Zona"
                        total={totalEjecucion}
                        data={dataEjecucion}
                    />

                    {/* GRÁFICO 2: OBRAS FINALIZADAS (usando ChartCard) */}
                    <ChartCard 
                        title="Obras Finalizadas por Zona"
                        total={totalFinalizadas}
                        data={dataFinalizadas}
                    />

                </main>
            </div>
            <Footer />
        </>
    );
}

export default Dashboard;