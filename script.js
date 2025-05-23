// Variables globales
let row = 7
let excelData = []
let selectedModule = ""
let selectedTeacher = ""
let microdisenoUploaded = false
let currentStep = 1
let webhookData = null
let notificationCount = 0
let eventSource = null
// Añadir una variable global para almacenar el archivo de microdiseño
let microdisenoFile = null

// Elementos del DOM
const excelFileInput = document.getElementById("excelFile")
const excelFileName = document.getElementById("excelFileName")
const moduleSelect = document.getElementById("moduleSelect")
const teacherSelect = document.getElementById("teacherSelect")
const resultsSection = document.getElementById("resultsSection")
const resultsBody = document.getElementById("resultsBody")
const microdisenoSection = document.getElementById("microdisenoSection")
const microdisenoFileElement = document.getElementById("microdisenoFile")
const microdisenoFileName = document.getElementById("microdisenoFileName")
const submitSection = document.getElementById("submitSection")
const submitButton = document.getElementById("submitButton")
const messageDiv = document.getElementById("message")
const steps = document.querySelectorAll(".step")

// Elementos del webhook
const webhookResults = document.getElementById("webhookResults")
const webhookTableBody = document.getElementById("webhookTableBody")
const statusDot = document.getElementById("statusDot")
const statusText = document.getElementById("statusText")
const notificationBadge = document.getElementById("notificationBadge")
const copyUrlBtn = document.getElementById("copyUrlBtn")

// Elementos del modal
const textModal = document.getElementById("textModal")
const modalTitle = document.getElementById("modalTitle")
const modalBody = document.getElementById("modalBody")
const closeModalButton = document.getElementById("closeModalButton")
const closeModalX = document.querySelector(".close-modal")

// Event Listeners
excelFileInput.addEventListener("change", handleExcelUpload)
moduleSelect.addEventListener("change", handleModuleChange)
teacherSelect.addEventListener("change", handleTeacherChange)
microdisenoFileElement.addEventListener("change", handleMicrodisenoUpload)
submitButton.addEventListener("click", submitReport)
closeModalButton.addEventListener("click", closeModal)
closeModalX.addEventListener("click", closeModal)
copyUrlBtn.addEventListener("click", copyWebhookUrl)

// Inicializar conexión con el servidor de webhook
initWebhookConnection()

// Función para inicializar la conexión del webhook usando Server-Sent Events (SSE)
function initWebhookConnection() {
  // URL del servidor de webhook
  const serverUrl = "https://proyectousa.onrender.com"

  try {
    // Crear una conexión SSE
    eventSource = new EventSource(`${serverUrl}/events`)

    // Manejar el evento de conexión abierta
    eventSource.onopen = () => {
      console.log("Conexión SSE establecida")
      statusDot.classList.remove("offline")
      statusDot.classList.add("online")
      statusText.textContent = "Webhook conectado"
    }

    // Manejar el evento de mensaje recibido
    eventSource.addEventListener("webhook-data", (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebhookData(data)
      } catch (error) {
        console.error("Error al procesar los datos del webhook:", error)
      }
    })

    // Manejar errores de conexión
    eventSource.onerror = () => {
      console.error("Error en la conexión SSE")
      statusDot.classList.remove("online")
      statusDot.classList.add("offline")
      statusText.textContent = "Webhook desconectado"

      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          initWebhookConnection()
        }
      }, 5000)
    }
  } catch (error) {
    console.error("Error al inicializar la conexión SSE:", error)
    statusDot.classList.remove("online")
    statusDot.classList.add("offline")
    statusText.textContent = "Error de conexión"

    // Para fines de demostración, simular la recepción de datos después de 5 segundos
    setTimeout(simulateWebhookData, 5000)
  }
}

// Función para simular la recepción de datos (solo para demostración)
function simulateWebhookData() {
  // Datos de ejemplo
  const exampleData = {
    "DERE0042-R02": [
      {
        temaDado:
          "Presentación del Micro currículo, socialización Tema: Introducción a la Historia de la Filosofía del Derecho Concepto – utilidad- objeto -relación con otras ciencias",
        temaEsperado: "Bienvenida al curso y presentación de la clase y presentación del contenido programático",
        success: true,
        week: "02/06/2025 - 02/07/2025",
        dateOfClass: "2/6/2025",
        observations: "None",
      },
      {
        temaDado: "Concepto de Filosofía del Derecho",
        temaEsperado: "Concepto de Filosofía del Derecho",
        success: true,
        week: "02/13/2025 - 02/14/2025",
        dateOfClass: "2/13/2025",
        observations: "None",
      },
    ],
    "DERE0042-R03": [
      {
        temaDado: "Introducción a la materia",
        temaEsperado: "Presentación del curso y metodología",
        success: false,
        week: "02/06/2025 - 02/07/2025",
        dateOfClass: "2/7/2025",
        observations: "None",
      },
    ],
  }

  // Procesar los datos simulados
  handleWebhookData(exampleData)

  // Cambiar el estado a conectado
  statusDot.classList.remove("offline")
  statusDot.classList.add("online")
  statusText.textContent = "Webhook conectado (simulado)"
}

// Función para manejar los datos recibidos por el webhook
function handleWebhookData(data) {
  webhookData = data

  // Incrementar contador de notificaciones
  notificationCount++
  notificationBadge.textContent = notificationCount
  notificationBadge.classList.remove("hidden")

  // Mostrar los datos en la tabla
  displayWebhookData(data)

  // Mostrar la sección de resultados
  webhookResults.classList.remove("hidden")

  // Mostrar mensaje de notificación
  showMessage('<i class="fas fa-bell"></i> Nuevos datos recibidos por webhook', "success")
}

// Función para actualizar el indicador de pasos
function updateStepIndicator(step) {
  currentStep = step

  steps.forEach((stepEl, index) => {
    const stepNum = index + 1

    if (stepNum < step) {
      stepEl.classList.add("completed")
      stepEl.classList.remove("active")
    } else if (stepNum === step) {
      stepEl.classList.add("active")
      stepEl.classList.remove("completed")
    } else {
      stepEl.classList.remove("active", "completed")
    }
  })
}

// Función para manejar la carga del archivo Excel
function handleExcelUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  excelFileName.textContent = file.name

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      // XLSX ya está disponible globalmente desde el script en el HTML
      const workbook = XLSX.read(data, { type: "array" })

      // Asumimos que los datos están en la primera hoja
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // Convertir a JSON
      excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      // Verificar si hay datos y si tienen el formato esperado
      if (excelData.length < 2) {
        showMessage("El archivo no contiene datos suficientes", "error")
        return
      }

      // Asumimos que la primera fila son los encabezados
      const headers = excelData[0]

      // Verificar si los encabezados son los esperados
      const expectedHeaders = [
        "Módulo",
        "Grupo",
        "Docente",
        "Fecha de Clase",
        "Tema",
        "Fecha Ingreso",
        "Hrs. Clase",
        "Hora Ingreso",
      ]
      const hasExpectedFormat = expectedHeaders.every((header) => headers.includes(header))

      if (!hasExpectedFormat) {
        showMessage("El formato del archivo no es el esperado", "error")
        return
      }

      // Procesar los datos para obtener módulos y docentes únicos
      processExcelData()

      // Actualizar el indicador de pasos
      updateStepIndicator(2)
    } catch (error) {
      console.error("Error al procesar el archivo:", error)
      showMessage("Error al procesar el archivo. Asegúrese de que sea un archivo Excel válido.", "error")
    }
  }

  reader.readAsArrayBuffer(file)
}

// Función para procesar los datos del Excel
function processExcelData() {
  if (excelData.length < 2) return

  const headers = excelData[0]
  const moduleIndex = headers.indexOf("Módulo")
  const teacherIndex = headers.indexOf("Docente")

  if (moduleIndex === -1 || teacherIndex === -1) {
    showMessage("No se encontraron las columnas de Módulo o Docente", "error")
    return
  }

  // Obtener módulos y docentes únicos
  const uniqueModules = new Set()
  const uniqueTeachers = new Set()

  for (let i = 1; i < excelData.length; i++) {
    const row = excelData[i]
    if (row[moduleIndex] && row[teacherIndex]) {
      uniqueModules.add(row[moduleIndex])
      uniqueTeachers.add(row[teacherIndex])
    }
  }

  // Llenar los dropdowns
  populateDropdown(moduleSelect, Array.from(uniqueModules).sort())
  populateDropdown(teacherSelect, Array.from(uniqueTeachers).sort())

  // Habilitar los dropdowns
  moduleSelect.disabled = false
  teacherSelect.disabled = false

  showMessage(
    '<i class="fas fa-check-circle"></i> Archivo procesado correctamente. Seleccione un módulo y un docente.',
    "success",
  )
}

// Función para llenar un dropdown
function populateDropdown(selectElement, options) {
  // Limpiar opciones existentes excepto la primera
  while (selectElement.options.length > 1) {
    selectElement.remove(1)
  }

  // Agregar nuevas opciones
  options.forEach((option) => {
    const optionElement = document.createElement("option")
    optionElement.value = option
    optionElement.textContent = option
    selectElement.appendChild(optionElement)
  })
}

// Función para manejar el cambio de módulo
function handleModuleChange() {
  selectedModule = moduleSelect.value
  updateResults()
}

// Función para manejar el cambio de docente
function handleTeacherChange() {
  selectedTeacher = teacherSelect.value
  updateResults()
}

// Función para actualizar los resultados
function updateResults() {
  if (!selectedModule || !selectedTeacher) {
    resultsSection.classList.add("hidden")
    microdisenoSection.classList.add("hidden")
    submitSection.classList.add("hidden")
    return
  }

  // Filtrar datos según el módulo y docente seleccionados
  const headers = excelData[0]
  const moduleIndex = headers.indexOf("Módulo")
  const teacherIndex = headers.indexOf("Docente")

  const filteredData = excelData
    .slice(1)
    .filter((row) => row[moduleIndex] === selectedModule && row[teacherIndex] === selectedTeacher)

  // Mostrar resultados
  resultsBody.innerHTML = ""

  if (filteredData.length === 0) {
    const row = document.createElement("tr")
    const cell = document.createElement("td")
    cell.colSpan = headers.length
    cell.textContent = "No se encontraron resultados para esta combinación de módulo y docente."
    cell.style.textAlign = "center"
    row.appendChild(cell)
    resultsBody.appendChild(row)
  } else {
    filteredData.forEach((rowData) => {
      const row = document.createElement("tr")

      headers.forEach((header, index) => {
        const cell = document.createElement("td")
        cell.textContent = rowData[index] || ""
        row.appendChild(cell)
      })

      resultsBody.appendChild(row)
    })
  }

  // Mostrar secciones
  resultsSection.classList.remove("hidden")
  microdisenoSection.classList.remove("hidden")
  submitSection.classList.remove("hidden")

  // Actualizar el indicador de pasos
  updateStepIndicator(3)
}
async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(" ") + "\n\n";
    }
    return fullText;
  }
  
// Modificar la función handleMicrodisenoUpload para guardar el archivo
async function handleMicrodisenoUpload(event) {
    event.preventDefault();
    const file = event.target.files[0];
    if (!file) return;
    webhookTableBody.innerHTML = "";

    microdisenoFile = file;
    microdisenoFileName.textContent = file.name;
    microdisenoUploaded = true;
    updateSubmitButton();
    updateStepIndicator(4);
  
    // Aquí extraemos y mostramos el texto
    try {
      const texto = await extractPdfText(file);
      
    } catch (err) {
      console.error("Error al extraer texto del PDF:", err);
    }
  }
  
// Función para actualizar el estado del botón de envío
function updateSubmitButton() {
  submitButton.disabled = !(selectedModule && selectedTeacher && microdisenoUploaded)

  if (!submitButton.disabled) {
    updateStepIndicator(5)
  }
}

// Modificar la función submitReport para incluir el contenido del microdiseño como string
async function submitReport() {
    row = 7
    if (!selectedModule || !selectedTeacher) {
      showMessage('<i class="fas fa-exclamation-triangle"></i> Debe seleccionar un módulo y un docente', "error");
      return;
    }
    if (!microdisenoFile) {
      showMessage('<i class="fas fa-exclamation-triangle"></i> Debe subir el archivo de microdiseño', "error");
      return;
    }
  
    showMessage('<i class="fas fa-spinner fa-spin"></i> Procesando y enviando reporte...', "success");
  
    try {
      // Extraemos el texto del PDF
      const textoExtraido = await extractPdfText(microdisenoFile);
      console.log("Texto extraído del PDF:", textoExtraido);
  
      // Preparamos el payload con el texto legible
      const payload = {
        modulo: selectedModule,
        docente: selectedTeacher,
        microdiseno: {
          nombre: microdisenoFile.name,
          tipo: microdisenoFile.type,
          contenido: textoExtraido    // <-- aquí va el texto legible
        }
      };
  
      const res = await fetch("https://hook.us2.make.com/y1tdc65uhvgp5o5plum5bw10or62dld9", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Error en la respuesta del servidor");
  
      await res.text();
      showMessage('<i class="fas fa-check-circle"></i> Reporte enviado correctamente', "success");
      steps.forEach(s => { s.classList.add("completed"); s.classList.remove("active"); });
    } catch (err) {
      console.error("Error en submitReport:", err);
      showMessage('<i class="fas fa-exclamation-circle"></i> Error al enviar el reporte: ' + err.message, "error");
    }
  }
// Función para mostrar mensajes
function showMessage(text, type) {
  messageDiv.innerHTML = text
  messageDiv.className = "message " + type
  messageDiv.classList.remove("hidden")

  // Ocultar el mensaje después de 5 segundos si es un mensaje de éxito
  if (type === "success") {
    setTimeout(() => {
      messageDiv.classList.add("hidden")
    }, 5000)
  }
}

// Función para mostrar los datos del webhook en la tabla
function displayWebhookData(data) {
  webhookTableBody.innerHTML = ""

  // Iterar sobre cada grupo en los datos
  for (const groupId in data) {
    const groupData = data[groupId]

    // Iterar sobre cada entrada en el grupo
    groupData.forEach((entry) => {
      const row = document.createElement("tr")

      // Aplicar clase según el estado de éxito
      if (entry.success) {
        row.classList.add("success-row")
      } else {
        row.classList.add("error-row")
      }

      // Crear celdas para cada columna
      // Grupo
      const groupCell = document.createElement("td")
      groupCell.textContent = groupId
      row.appendChild(groupCell)

      // Fecha de Clase
      const dateCell = document.createElement("td")
      dateCell.textContent = entry.dateOfClass || ""
      row.appendChild(dateCell)

      // Tema Dado (con truncado y botón para expandir)
      const temaDadoCell = document.createElement("td");
      temaDadoCell.textContent = entry.temaDado || "";
      row.appendChild(temaDadoCell);


      // Tema Esperado (con truncado y botón para expandir)
      const temaEsperadoCell = document.createElement("td");
      temaEsperadoCell.textContent = entry.temaEsperado || "";
      row.appendChild(temaEsperadoCell);

      // Semana
      const weekCell = document.createElement("td")
      weekCell.textContent = entry.week || ""
      row.appendChild(weekCell)

      // Estado
      const statusCell = document.createElement("td")
      if (entry.success) {
        statusCell.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success-color);"></i> Coherencia'
      } else {
        statusCell.innerHTML = '<i class="fas fa-times-circle" style="color: var(--error-color);"></i> Incoherencia'
      }
      row.appendChild(statusCell)

      // Observaciones
      const obsCell = document.createElement("td")
      obsCell.textContent = entry.observations || "None"
      row.appendChild(obsCell)

      // Acciones (botones de check y x)
      const actionsCell = document.createElement("td")
      const actionsDiv = document.createElement("div")
      actionsDiv.className = "action-buttons"

      // Botón de check
      const checkBtn = document.createElement("button")
      checkBtn.className = "btn-check"
      checkBtn.innerHTML = '<i class="fas fa-check"></i>'
      checkBtn.onclick = () => {sendActionRequest(groupId, entry, false);   row.remove()}   // elimina la fila al aprobar

      actionsDiv.appendChild(checkBtn)

      // Botón de x
      const xBtn = document.createElement("button")
      xBtn.className = "btn-x"
      xBtn.innerHTML = '<i class="fas fa-times"></i>'
      xBtn.onclick = () => {sendActionRequest(groupId, entry, true);   row.remove() }  // elimina la fila al aprobar
      actionsDiv.appendChild(xBtn)

      actionsCell.appendChild(actionsDiv)
      row.appendChild(actionsCell)

      // Agregar la fila a la tabla
      webhookTableBody.appendChild(row)
    })
  }
}

// Función para enviar la solicitud de acción (check o x)
function sendActionRequest(groupId, entry, color) {
  // Crear objeto con los datos a enviar
  const data = {
    ...entry,
    groupId: groupId,
    color: color,
    modulo: selectedModule,
    docente: selectedTeacher,
    row: row++,
  }

  // Mostrar mensaje de carga
  showMessage('<i class="fas fa-spinner fa-spin"></i> Enviando acción...', "success")

  // AQUÍ ES DONDE SE DEBE COLOCAR LA URL PARA LA SOLICITUD POST
  const postUrl = "https://hook.us2.make.com/m4sw3hygyr8rh33ishohc6f1l2c6rim1"

  // Enviar datos al webhook
  fetch(postUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor")
      }
      return response.text()
    })
    .then((result) => {
      showMessage(
        `<i class="fas fa-check-circle"></i> Acción ${color ? "rechazar" : "aprobar"} enviada correctamente`,
        "success",
      )
    })
    .catch((error) => {
      console.error("Error al enviar la acción:", error)
      showMessage('<i class="fas fa-exclamation-circle"></i> Error al enviar la acción: ' + error.message, "error")
    })
}

// Función para mostrar el modal con texto completo
function showTextModal(title, text) {
  modalTitle.textContent = title
  modalBody.textContent = text
  textModal.style.display = "block"
}

// Función para cerrar el modal
function closeModal() {
  textModal.style.display = "none"
}

// Función para copiar la URL del webhook
function copyWebhookUrl() {
  const webhookUrl = document.getElementById("webhookUrl")
  navigator.clipboard
    .writeText(webhookUrl.textContent)
    .then(() => {
      copyUrlBtn.innerHTML = '<i class="fas fa-check"></i>'
      setTimeout(() => {
        copyUrlBtn.innerHTML = '<i class="fas fa-copy"></i>'
      }, 2000)
    })
    .catch((err) => {
      console.error("Error al copiar: ", err)
    })
}

// Cerrar el modal si se hace clic fuera de él
window.onclick = (event) => {
  if (event.target === textModal) {
    closeModal()
  }
}

// Limpiar la conexión SSE cuando se cierra la página
window.addEventListener("beforeunload", () => {
  if (eventSource) {
    eventSource.close()
  }
})

// Inicializar el indicador de pasos
updateStepIndicator(1)
