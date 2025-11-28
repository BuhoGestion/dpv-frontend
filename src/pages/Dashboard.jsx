import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Header from "./Header";
import "../styles/Dashboard.css";
import Footer from "./Footer";

ChartJS.register(ArcElement, Tooltip, Legend);

// Base URL para asegurar consistencia
const API_BASE_URL = "https://localhost:44311/api";

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

  // Colores consistentes para los gráficos
  const chartColors = ["#22C55E", "#F87171", "#FBBF24", "#0EA5E9", "#A855F7"];

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
        backgroundColor: chartColors,
        borderWidth: 1,
      },
    ],
  };

  // --- Lógica del Gráfico FINALIZADAS ---
  const dataFinalizadas = {
    labels: porZonaFinalizadas.map((z) => z.zona),
    datasets: [
      {
        data: porZonaFinalizadas.map((z) => z.cantidad),
        backgroundColor: chartColors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    cutout: "70%",
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 20, padding: 15 },
      },
      tooltip: {
        callbacks: {
          label: ({ label, raw }) => `${label}: ${raw}`,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="dashboard loading">
                <Header nombreUsuario={userName} onLogout={onLogout} />       {" "}
        <main className="dashboard-content">
                    <p>Cargando datos del Dashboard... 🔄</p>       {" "}
        </main>
                <Footer />     {" "}
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Header nombreUsuario={userName} onLogout={onLogout} />       {" "}
        <div className="dashboard error">
                   {" "}
          <main className="dashboard-content">
                <h2>Obras DPV</h2>   
            <p style={{ color: "red", fontWeight: "bold" }}>Error: {error}</p> 
            <p>
                            No se pudieron cargar los gráficos. Asegúrate que el
              backend esté               corriendo y registrado.         
            </p>
          </main>
        </div>
      <Footer />    
      </>
    );
  }

  return (
    <>
      <Header nombreUsuario={userName} onLogout={onLogout} />
      <div className="dashboard">
        <h2>Obras DPV</h2>
        <main className="dashboard-content">
          {/* GRÁFICO 1: OBRAS EN EJECUCIÓN */}
          <div>
            <h3>Obras en ejecución por zona</h3>
            <p>
              Total obras: <strong>{totalEjecucion}</strong>
            </p>

            <div className="chart-container">
              {totalEjecucion > 0 ? (
                <Doughnut data={dataEjecucion} options={options} />
              ) : (
                <p>No hay obras en ejecución para mostrar.</p>
              )}
              <div className="chart-center">
                <span>{totalEjecucion}</span>
              </div>
            </div>
          </div>

          {/* GRÁFICO 2: OBRAS FINALIZADAS */}
          <div>
            <h3>Obras finalizadas por zona</h3>
            <p>
              Total obras: <strong>{totalFinalizadas}</strong>
            </p>

            <div className="chart-container">
              {totalFinalizadas > 0 ? (
                <Doughnut data={dataFinalizadas} options={options} />
              ) : (
                <p>No hay obras finalizadas para mostrar.</p>
              )}
              <div className="chart-center">
                <span>{totalFinalizadas}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </>
  );
}

export default Dashboard;
