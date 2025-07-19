"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import type { ProductCalculatedData, AppView, ChatMessage } from "../types"
import { processAndCalculate, exportResultsToExcel } from "../services/dataProcessor"
import Header from "../components/Header"
import Footer from "../components/Footer"
import FileUpload from "../components/FileUpload"
import ConfigUpload from "../components/ConfigUpload"
import ResultsTable from "../components/ResultsTable"
import LoadingSpinner from "../components/LoadingSpinner"
import SearchFilters from "../components/SearchFilters"
import NumericInputCard from "../components/NumericInputCard"
import NotificationPanel from "../components/NotificationPanel"
import InstructionPanel from "../components/InstructionPanel"
import ChatPanel from "../components/ChatPanel"
import { GoogleGenAI, Chat } from "@google/genai"

export default function SmartSupply() {
  const [calculationResults, setCalculationResults] = useState<ProductCalculatedData[] | null>(null)
  const [weekHeaders, setWeekHeaders] = useState<string[]>([])
  const [processingInfo, setProcessingInfo] = useState<{ totalTransactions: number; uniqueProducts: number } | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [view, setView] = useState<AppView>("upload")

  // File states
  const [salesFile, setSalesFile] = useState<File | null>(null)
  const [configFile, setConfigFile] = useState<File | null>(null)

  // Unified state for calculation parameters
  const [weeksToAnalyze, setWeeksToAnalyze] = useState<number>(8)
  const [periodsDivisor, setPeriodsDivisor] = useState<number>(4)

  // Filter states
  const [skuSearch, setSkuSearch] = useState<string>("")
  const [nameSearch, setNameSearch] = useState<string>("")
  const [appliedSkuSearch, setAppliedSkuSearch] = useState<string>("")
  const [appliedNameSearch, setAppliedNameSearch] = useState<string>("")

  // AI Chat state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const chat = useRef<Chat | null>(null)
  const ai = useMemo(() => {
    try {
      return new GoogleGenAI({ apiKey: process.env.API_KEY as string })
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI:", e)
      return null
    }
  }, [])


  const handleCalculate = useCallback(async () => {
    if (!salesFile) {
      setError("Por favor, sube un archivo de ventas para continuar.")
      return
    }

    setIsLoading(true)
    setError(null)
    setWarnings([])
    setCalculationResults(null)
    setView("upload") // Keep view on upload page while processing

    const {
      results,
      weekHeaders: headers,
      error: processingError,
      warnings: processingWarnings,
      processingInfo: info,
    } = await processAndCalculate(salesFile, configFile, weeksToAnalyze, periodsDivisor)

    if (processingError) {
      setError(processingError)
    }

    if (processingWarnings) {
      setWarnings(processingWarnings)
    }

    if (info) {
      setProcessingInfo(info)
    }

    if (headers) {
      setWeekHeaders(headers)
    }

    if (results && results.length > 0) {
      setCalculationResults(results)
      setView("results")
    } else {
      // If there are no results, stay on the upload page to show the error
      setView("upload")
    }

    setIsLoading(false)
  }, [salesFile, configFile, weeksToAnalyze, periodsDivisor])

  const filteredResults = useMemo(() => {
    if (!calculationResults) return []

    const skuSearchTerms = appliedSkuSearch
      .split(",")
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term.length > 0)

    const nameSearchTerms = appliedNameSearch
      .split(",")
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term.length > 0)
      
    if (skuSearchTerms.length === 0 && nameSearchTerms.length === 0) {
      return calculationResults;
    }

    return calculationResults.filter((product) => {
      const skuMatch =
        skuSearchTerms.length === 0
          ? true
          : skuSearchTerms.some((term) => product.ID.toLowerCase().includes(term))

      const nameMatch =
        nameSearchTerms.length === 0
          ? true
          : nameSearchTerms.some((term) => product.Nombre.toLowerCase().includes(term))

      return skuMatch && nameMatch
    })
  }, [calculationResults, appliedSkuSearch, appliedNameSearch])

  const handleExportResults = () => {
    if (filteredResults && filteredResults.length > 0 && salesFile && processingInfo) {
      exportResultsToExcel(
        filteredResults,
        weekHeaders,
        salesFile.name,
        weeksToAnalyze,
        periodsDivisor,
        processingInfo,
      )
    }
  }
  
  const handleFilter = useCallback(() => {
    setAppliedSkuSearch(skuSearch);
    setAppliedNameSearch(nameSearch);
  }, [skuSearch, nameSearch]);


  const handleStartOver = () => {
    setCalculationResults(null)
    setError(null)
    setWarnings([])
    setIsLoading(false)
    setView("upload")
    setSalesFile(null)
    setConfigFile(null)
    setSkuSearch("")
    setNameSearch("")
    setAppliedSkuSearch("")
    setAppliedNameSearch("")
    setWeeksToAnalyze(8)
    setPeriodsDivisor(4)
    setIsChatOpen(false)
    setChatMessages([])
    chat.current = null;
    // Clear the file inputs visually
    const salesFileInput = document.getElementById("file-upload") as HTMLInputElement
    if (salesFileInput) salesFileInput.value = ""
    const configFileInput = document.getElementById("config-file-upload") as HTMLInputElement
    if (configFileInput) configFileInput.value = ""
  }

  const handleClearFilters = () => {
    setSkuSearch("")
    setNameSearch("")
    setAppliedSkuSearch("")
    setAppliedNameSearch("")
  }

  const handleRecalculate = useCallback(async () => {
    if (!salesFile) return

    setIsLoading(true)
    setError(null)
    setWarnings([])

    const {
      results,
      weekHeaders: headers,
      error: processingError,
      warnings: processingWarnings,
      processingInfo: info,
    } = await processAndCalculate(salesFile, configFile, weeksToAnalyze, periodsDivisor)

    if (processingError) {
      setError(processingError)
    }
    if (processingWarnings) {
      setWarnings(processingWarnings)
    }
    if (info) {
      setProcessingInfo(info)
    }
    if (headers) {
      setWeekHeaders(headers)
    }
    if (results && results.length > 0) {
      setCalculationResults(results)
    }

    setIsLoading(false)
  }, [salesFile, configFile, weeksToAnalyze, periodsDivisor])

  const handleOpenChat = () => {
     if (!ai) {
      setChatMessages([
        { role: 'model', content: 'La clave de API para el Asistente de IA no está configurada. Por favor, asegúrate de que la variable de entorno `API_KEY` esté disponible.' }
      ]);
      setIsChatOpen(true);
      return;
    }
    if (!chat.current && filteredResults) {
      const dataForPrompt = filteredResults.slice(0, 20).map(p => ({
        ID: p.ID,
        Nombre: p.Nombre,
        Venta_Prom_Semanal: p.Venta_Promedio_Semanal,
        Stock_Actual: p.Stock_Actual,
        Stock_Ideal: p.Stock_Ideal,
        A_Abastecer: p.Unidades_A_Abastecer,
        Estado: p.status,
        Error: p.error || null,
      }));
      const systemInstruction = `Eres un asistente experto en análisis de cadena de suministro. El usuario te ha proporcionado un extracto de sus datos de cálculo de inventario en formato JSON. Estos datos son una instantánea de su vista filtrada actual. Responde a sus preguntas sobre estos datos de forma clara y concisa. Utiliza el formato markdown para las listas y el texto enfatizado. Aquí está el contexto de datos para la sesión del usuario: ${JSON.stringify(dataForPrompt, null, 2)}`;
      chat.current = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction,
        },
      });
      // Send an initial message to get a welcome from the AI
      handleSendMessage("Hola, ¿puedes darme un resumen de estos datos?", true)
    }
    setIsChatOpen(true);
  };

  const handleSendMessage = useCallback(async (message: string, isSystemMessage = false) => {
    if (!chat.current) return;
    
    if(!isSystemMessage){
      setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    }
    setIsAiLoading(true);

    try {
      const stream = await chat.current.sendMessageStream({ message });
      
      let modelResponse = '';
      setChatMessages(prev => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setChatMessages(currentMessages => {
          const updatedMessages = [...currentMessages];
          updatedMessages[updatedMessages.length - 1].content = modelResponse;
          return updatedMessages;
        });
      }
    } catch (e) {
      console.error(e);
      const errorMsg = e instanceof Error ? e.message : "Ocurrió un error al contactar la IA.";
      setChatMessages(current => [...current, { role: 'model', content: `Error: ${errorMsg}` }]);
    } finally {
      setIsAiLoading(false);
    }
  }, [chat]);


  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {view === "upload" && (
          <div className="flex flex-col items-center gap-8">
            <InstructionPanel />
            <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
               <NumericInputCard
                id="weeks-analyzer"
                label="Semanas a Analizar"
                sublabel="(mín. 2, máx. 20)"
                value={weeksToAnalyze}
                onChange={setWeeksToAnalyze}
                min={2}
                max={20}
              />
              <NumericInputCard
                id="periods-divisor"
                label="Divisor de Períodos"
                sublabel="(mín. 1, máx. 52)"
                value={periodsDivisor}
                onChange={setPeriodsDivisor}
                min={1}
                max={52}
              />
              <FileUpload onFileSelected={setSalesFile} isLoading={isLoading} selectedFile={salesFile} />
              <ConfigUpload onFileSelected={setConfigFile} isLoading={isLoading} selectedFile={configFile} />
            </div>

            <div>
              <button
                onClick={handleCalculate}
                disabled={isLoading || !salesFile}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Calculando..." : "Calcular Abastecimiento"}
              </button>
            </div>

            {isLoading && <LoadingSpinner />}
            {error && (
              <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md w-full max-w-3xl whitespace-pre-wrap">
                <h3 className="font-bold text-lg mb-2">
                  Error{salesFile ? ` (Archivo: ${salesFile.name})` : ""}:
                </h3>
                <p>{error}</p>
              </div>
            )}
          </div>
        )}

        {view === "results" && calculationResults && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h2 className="text-2xl lg:text-3xl font-semibold text-slate-700 mb-4 sm:mb-0">
                Resultados del Cálculo de Abastecimiento
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleStartOver}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                  Empezar de Nuevo
                </button>
                <button
                  onClick={handleExportResults}
                  disabled={!filteredResults || filteredResults.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50"
                  aria-label="Exportar resultados a Excel"
                >
                  Exportar a Excel
                </button>
                <button
                  onClick={handleOpenChat}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex items-center gap-2"
                  aria-label="Preguntar a la IA sobre los resultados"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.938V19a1 1 0 01-2 0v-4.062a8.001 8.001 0 01-4.938-7.468A5.002 5.002 0 0110 2a5.002 5.002 0 017.938 3.468A8.001 8.001 0 0111 14.938z" clipRule="evenodd" /></svg>
                  Preguntar a IA
                </button>
              </div>
            </div>

            <div className="mb-6">
               <SearchFilters
                skuSearch={skuSearch}
                onSkuChange={setSkuSearch}
                nameSearch={nameSearch}
                onNameChange={setNameSearch}
                totalCount={calculationResults.length}
                filteredCount={filteredResults.length}
                onClearFilters={handleClearFilters}
                onFilter={handleFilter}
                periodsDivisor={periodsDivisor}
                onPeriodsDivisorChange={setPeriodsDivisor}
                weeksToAnalyze={weeksToAnalyze}
                onWeeksToAnalyzeChange={setWeeksToAnalyze}
                onRecalculate={handleRecalculate}
              />
            </div>

            {salesFile && (
              <div className="text-sm text-slate-600 mb-4">
                <p>
                  Mostrando resultados para el archivo: <strong>{salesFile.name}</strong> (Análisis de {weeksToAnalyze}{" "}
                  semanas, Divisor: {periodsDivisor})
                </p>
                {configFile && (
                  <p>
                    Usando reglas de: <strong>{configFile.name}</strong>
                  </p>
                )}
                {processingInfo && (
                  <p className="mt-1">
                    <strong>Procesamiento:</strong> {processingInfo.totalTransactions} transacciones procesadas,{" "}
                    {processingInfo.uniqueProducts} productos únicos
                  </p>
                )}
              </div>
            )}
            
            {warnings && warnings.length > 0 && (
                <NotificationPanel warnings={warnings} />
            )}
            
            {isLoading ? <LoadingSpinner /> : <ResultsTable results={filteredResults} weekHeaders={weekHeaders} />}
          </div>
        )}
      </main>
      <Footer />
      <ChatPanel 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isAiLoading}
      />
    </div>
  )
}
