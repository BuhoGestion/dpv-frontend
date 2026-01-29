import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarReporteExcel = async (obrasFiltradas, getEquiposUnicos) => {
    if (!obrasFiltradas || obrasFiltradas.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Obras DPV');

    // 1. CONFIGURACIÓN DE COLUMNAS (Importante: Definirlas primero)
    worksheet.columns = [
        { key: 'num', width: 6 },
        { key: 'nombre', width: 35 },
        { key: 'tramo', width: 35 },
        { key: 'zona', width: 15 },
        { key: 'seccional', width: 25 },
        { key: 'deptos', width: 30 },
        { key: 'inicio', width: 15 },
        { key: 'fin', width: 15 },
        { key: 'tareas', width: 50 },
        { key: 'equipos', width: 30 },
        { key: 'longitud', width: 15 },
        { key: 'superficie', width: 20 },
        { key: 'tipo', width: 20 },
        { key: 'estado', width: 15 },
        { key: 'monto', width: 20 },
        { key: 'obs', width: 40 },
    ];

    // 2. CREAR EL BANNER DE TÍTULO (Fila 1)
    worksheet.mergeCells('A1:P1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REPORTE GENERAL DE OBRAS - DIRECCIÓN PROVINCIAL DE VIALIDAD';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }; // Azul
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 45;

    // 3. CREAR ENCABEZADOS DE TABLA MANUALMENTE (Fila 2)
    // Esto evita que Excel ponga los nombres de las 'keys' o el error de "OBSERVACIONES"
    const headerNames = [
        'N°', 'OBRA', 'TRAMO', 'ZONA', 'SECCIONAL', 'DEPARTAMENTOS', 
        'INICIO', 'FIN', 'TAREAS (AVANCE)', 'EQUIPOS', 'KM', 
        'SUPERFICIE', 'TIPO', 'ESTADO', 'INVERSIÓN', 'OBSERVACIONES'
    ];
    
    const headerRow = worksheet.getRow(2);
    headerRow.values = headerNames;
    
    // Estilo para los encabezados (Fila 2)
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Gris azulado
        cell.font = { bold: true, color: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: { style: 'medium', color: { argb: 'FF94A3B8' } } };
    });
    headerRow.height = 25;

    // 4. AGREGAR LOS DATOS (A partir de la fila 3)
    obrasFiltradas.forEach((obra, index) => {
        const row = worksheet.addRow({
            num: index + 1,
            nombre: obra.nombreObra.toUpperCase(),
            tramo: obra.tramo || '-',
            zona: obra.zona,
            seccional: obra.seccional,
            deptos: obra.departamentos.map(d => d.nombre).join(" - "),
            inicio: new Date(obra.fechaInicio).toLocaleDateString('es-AR'),
            fin: new Date(obra.fechaFin).toLocaleDateString('es-AR'),
            tareas: obra.tareas.map(t => `• ${t.nombre} (${t.avanceTotal}%)`).join("\n"), 
            equipos: getEquiposUnicos(obra.tareas).map(e => e.codigo).join(", "),
            longitud: obra.longitud,
            superficie: obra.tipoSuperficie,
            tipo: obra.tipoObra,
            estado: obra.estadoObra,
            monto: parseFloat(obra.montoContratado || 0),
            obs: obra.observaciones || ""
        });

        // 5. ESTILO DE CELDAS DE DATOS
        row.eachCell((cell, colNumber) => {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            
            // Colorear Estado
            if (colNumber === 14) { 
                cell.font = { bold: true, color: { argb: cell.value === 'Finalizada' ? 'FF16A34A' : 'FFD97706' } };
                cell.alignment = { horizontal: 'center' };
            }

            // Formato Moneda
            if (colNumber === 15) {
                cell.numFmt = '"$ "#,##0.00';
                cell.alignment = { horizontal: 'right' };
            }
        });
    });

    // 6. FILTROS Y PANELES
    worksheet.autoFilter = 'A2:P2'; // Filtros en la fila 2
    worksheet.views = [{ state: 'frozen', ySplit: 2 }]; // Congela hasta la fila 2

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Reporte_Obras_DPV_${new Date().getTime()}.xlsx`);
};