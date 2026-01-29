import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Header from "./Header";
import "../styles/Dashboard.css";
import Footer from "./Footer";
import { LayoutDashboard, Loader, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";

ChartJS.register(ArcElement, Tooltip, Legend);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getToken = () => sessionStorage.getItem("authToken");

function Dashboard({ userName, onLogout }) {
  const [totalEjecucion, setTotalEjecucion] = useState(0);
  const [porZonaEjecucion, setPorZonaEjecucion] = useState([]);
  const [totalFinalizadas, setTotalFinalizadas] = useState(0);
  const [porZonaFinalizadas, setPorZonaFinalizadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const chartColors = [
    "#10B981",
    "#EF4444",
    "#F59E0B",
    "#3B82F6",
    "#8B5CF6",
    "#06B6D4",
  ];

  // Función para abrir el PDF
  const handleOpenPDF = () => {
    window.open("/instructivo.pdf", "_blank");
  };

  // --- EFECTO PARA CARGA DE DATOS ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError("Error de autenticación.");
        setLoading(false);
        return;
      }
      const fetchOptions = { headers: { Authorization: `Bearer ${token}` } };
      try {
        const [ejecTotalRes, ejecZonaRes, finTotalRes, finZonaRes] =
          await Promise.all([
            fetch(`${API_BASE_URL}/ObraProyecto/total-ejecucion`, fetchOptions),
            fetch(
              `${API_BASE_URL}/ObraProyecto/por-zona-ejecucion`,
              fetchOptions
            ),
            fetch(
              `${API_BASE_URL}/ObraProyecto/total-finalizadas`,
              fetchOptions
            ),
            fetch(
              `${API_BASE_URL}/ObraProyecto/por-zona-finalizadas`,
              fetchOptions
            ),
          ]);

        setTotalEjecucion((await ejecTotalRes.json()).total || 0);
        setPorZonaEjecucion(await ejecZonaRes.json());
        setTotalFinalizadas((await finTotalRes.json()).total || 0);
        setPorZonaFinalizadas(await finZonaRes.json());
      } catch (err) {
        setError("Error de conexión con el servidor.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- EFECTO PARA EL MODAL DE BIENVENIDA (INSTRUCTIVO AUTOMÁTICO) ---
  useEffect(() => {
    // Usamos el nombre del usuario para que la preferencia sea individual
    const storageKey = `ocultarInstructivo_${userName}`;
    const yaSilenciado = sessionStorage.getItem(storageKey);

    // Si el usuario ya marcó "No volver a mostrar", cortamos la ejecución aquí
    if (yaSilenciado === "true") return;

    Swal.fire({
      title: "¡Bienvenido al Sistema DPV!",
      text: "Ya se encuentra disponible el nuevo instructivo          ¡Consúltalo para despejar tus dudas!",
      icon: "info",
      iconColor: "#3B82F6",
      showCancelButton: true,
      showDenyButton: true, // Este es el botón de "No volver a mostrar"
      confirmButtonText: "📂 Ver Instructivo",
      denyButtonText: "No volver a mostrar",
      cancelButtonText: "Cerrar",
      confirmButtonColor: "#2563eb", // Azul
      denyButtonColor: "#ff4545ff", // Gris (para que no sea tan agresivo como el rojo)
      cancelButtonColor: "#606f80ff", // Gris claro
      reverseButtons: true,
      backdrop: `rgba(15, 23, 42, 0.7)`,
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed) {
        // Opción: Ver Instructivo
        handleOpenPDF();
        // Opcional: Si quieres que deje de salir después de verlo una vez,
        // podrías poner el sessionStorage.setItem aquí también.
      } else if (result.isDenied) {
        // Opción: No volver a mostrar (PERMANENTE)
        sessionStorage.setItem(storageKey, "true");

        // Confirmación pequeña de que se guardó la preferencia
        Swal.fire({
          title: "Preferencias guardadas",
          text: "No volverás a ver este aviso.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
      // Si toca "Luego" (Cancel), no hace nada y el ciclo se repite al próximo login.
    });
  }, [userName]); // Se activa al detectar el usuario

  const options = {
    cutout: "80%",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 15, padding: 20, font: { size: 14 } },
      },
    },
  };

  const ChartCard = ({ title, total, data }) => (
    <div className="stat-card">
      <h3>{title}</h3>
      <p className="total-display">
        Total: <strong>{total}</strong>
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
          <p>Sin datos para mostrar.</p>
        </div>
      )}
    </div>
  );

  if (loading)
    return (
      <div className="dashboard loading">
        <Header nombreUsuario={userName} onLogout={onLogout} />
        <main className="dashboard-content">
          <Loader className="spinner" size={40} color="#3B82F6" />
          <p>Cargando información del Dashboard...</p>
        </main>
        <Footer />
      </div>
    );

  return (
    <>
      <Header nombreUsuario={userName} onLogout={onLogout} />
      <div className="dashboard">
        <div className="dashboard-header-row">
          <h2>
            <LayoutDashboard
              size={32}
              style={{ verticalAlign: "middle", marginRight: "10px" }}
            />
            Dashboard de Obras DPV
          </h2>
          {/* El botón ha sido eliminado de aquí */}
        </div>

        <main className="dashboard-content">
          <ChartCard
            title="Obras en Ejecución por Zona"
            total={totalEjecucion}
            data={{
              labels: porZonaEjecucion.map((z) => z.zona),
              datasets: [
                {
                  data: porZonaEjecucion.map((z) => z.cantidad),
                  backgroundColor: chartColors.slice(
                    0,
                    porZonaEjecucion.length
                  ),
                  borderWidth: 0,
                },
              ],
            }}
          />

          <ChartCard
            title="Obras Finalizadas por Zona"
            total={totalFinalizadas}
            data={{
              labels: porZonaFinalizadas.map((z) => z.zona),
              datasets: [
                {
                  data: porZonaFinalizadas.map((z) => z.cantidad),
                  backgroundColor: chartColors.slice(
                    0,
                    porZonaFinalizadas.length
                  ),
                  borderWidth: 0,
                },
              ],
            }}
          />
        </main>
      </div>
      <Footer />
    </>
  );
}

export default Dashboard;
