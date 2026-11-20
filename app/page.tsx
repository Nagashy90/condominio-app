'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [condominios, setCondominios] = useState<any[]>([])
  const [condoSeleccionado, setCondoSeleccionado] = useState<any>(null)
  const [inmuebles, setInmuebles] = useState<any[]>([])
  const [inmuebleId, setInmuebleId] = useState('')
  const [recibos, setRecibos] = useState<any[]>([])
  
  // Estados para el formulario de pago
  const [reciboAPagar, setReciboAPagar] = useState<any>(null)
  const [metodo, setMetodo] = useState('Pago Móvil')
  const [referencia, setReferencia] = useState('')
  const [mensaje, setMensaje] = useState('')

  // 1. Cargar lista de condominios al abrir la web
  useEffect(() => {
    async function cargarCondominios() {
      const { data } = await supabase.from('condominios').select('*')
      if (data) setCondominios(data)
    }
    cargarCondominios()
  }, [])

  // 2. Cargar apartamentos cuando se elige un condominio
  async function seleccionarCondominio(id: string) {
    const condo = condominios.find(c => c.id === id)
    setCondoSeleccionado(condo)
    setInmuebleId('')
    setRecibos([])
    
    if (id) {
      const { data } = await supabase
        .from('inmuebles')
        .select('*')
        .eq('condominio_id', id)
      if (data) setInmuebles(data)
    }
  }

  // 3. Cargar recibos cuando se elige un apartamento
  async function seleccionarInmueble(id: string) {
    setInmuebleId(id)
    if (id) {
      const { data, error } = await supabase
        .from('recibos')
        .select('*')
        .eq('inmueble_id', id)
        .order('created_at', { ascending: false })
      console.log('Recibos encontrados:', data, 'Error:', error)
      if (data) setRecibos(data)
    }
  }

  // 4. Enviar reporte de pago
  async function reportarPago(e: React.FormEvent) {
    e.preventDefault()
    if (!reciboAPagar || !referencia) return

    const montoBs = (reciboAPagar.monto_usd * condoSeleccionado.tasa_bcv).toFixed(2)
    const montoFinal = metodo === 'Zelle' ? reciboAPagar.monto_usd : Number(montoBs)
    const moneda = metodo === 'Zelle' ? 'USD' : 'VES'

    const { error } = await supabase.from('pagos').insert({
      recibo_id: reciboAPagar.id,
      metodo,
      referencia,
      monto_pagado: montoFinal,
      moneda
    })

    if (!error) {
      // Actualizar estado del recibo a 'en_revision'
      await supabase
        .from('recibos')
        .update({ estado: 'en_revision' })
        .eq('id', reciboAPagar.id)

      setMensaje('¡Pago reportado con éxito! La junta de condominio lo verificará pronto.')
      setReciboAPagar(null)
      setReferencia('')
      seleccionarInmueble(inmuebleId) // Recargar recibos
    } else {
      setMensaje('Hubo un error al reportar el pago.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-800">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">MiCondominio.ve</h1>
          <p className="text-slate-500 mt-1">Consulta y paga tu recibo de condominio en línea</p>
        </div>

        {/* Selector de Condominio */}
        <div className="mb-5">
          <label className="block text-sm font-semibold mb-2">1. Selecciona tu Condominio</label>
          <select 
            className="w-full p-3 border border-slate-300 rounded-xl bg-white"
            onChange={(e) => seleccionarCondominio(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>-- Elige un edificio o urbanización --</option>
            {condominios.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.ciudad})</option>
            ))}
          </select>
        </div>

        {/* Selector de Apartamento */}
        {condoSeleccionado && (
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">2. Selecciona tu Apartamento / Casa</label>
            <select 
              className="w-full p-3 border border-slate-300 rounded-xl bg-white"
              value={inmuebleId}
              onChange={(e) => seleccionarInmueble(e.target.value)}
            >
              <option value="" disabled>-- Elige tu inmueble --</option>
              {inmuebles.map(i => (
                <option key={i.id} value={i.id}>{i.identificador} - {i.propietario_nombre}</option>
              ))}
            </select>
          </div>
        )}

        {mensaje && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
            {mensaje}
          </div>
        )}

        {/* Lista de Recibos */}
        {recibos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold border-b pb-2">Tus Recibos</h2>
            {recibos.map(r => {
              const montoBs = (r.monto_usd * condoSeleccionado.tasa_bcv).toFixed(2)
              return (
                <div key={r.id} className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{r.mes_anio}</span>
                    <h3 className="font-semibold text-slate-800">{r.concepto}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Monto: <strong className="text-slate-900">${r.monto_usd}</strong> 
                      <span className="text-slate-400 mx-2">|</span> 
                      <strong className="text-blue-600">Bs. {montoBs}</strong>
                    </p>
                  </div>

                  <div>
                    {r.estado === 'pendiente' && (
                      <button 
                        onClick={() => { setReciboAPagar(r); setMensaje('') }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                      >
                        Reportar Pago
                      </button>
                    )}
                    {r.estado === 'en_revision' && (
                      <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">
                        En revisión
                      </span>
                    )}
                    {r.estado === 'pagado' && (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                        Pagado
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal / Formulario de Reporte de Pago */}
        {reciboAPagar && (
          <form onSubmit={reportarPago} className="mt-8 p-5 border-2 border-blue-100 bg-blue-50/50 rounded-xl space-y-4">
            <h3 className="font-bold text-blue-900">Reportar Pago: {reciboAPagar.mes_anio}</h3>
            <div className="p-3 bg-white rounded-lg border border-blue-100 text-xs text-slate-600">
              <strong>Datos para transferir:</strong><br/>
              {condoSeleccionado.datos_pago}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Método utilizado</label>
              <select 
                className="w-full p-2.5 border rounded-lg bg-white text-sm"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
              >
                <option value="Pago Móvil">Pago Móvil (Bs. {(reciboAPagar.monto_usd * condoSeleccionado.tasa_bcv).toFixed(2)})</option>
                <option value="Transferencia">Transferencia Nacional (Bs. {(reciboAPagar.monto_usd * condoSeleccionado.tasa_bcv).toFixed(2)})</option>
                <option value="Zelle">Zelle (${reciboAPagar.monto_usd})</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Número de Referencia</label>
              <input 
                type="text" 
                required
                placeholder="Ej: 123456"
                className="w-full p-2.5 border rounded-lg bg-white text-sm"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold">
                Enviar Comprobante
              </button>
              <button type="button" onClick={() => setReciboAPagar(null)} className="px-4 py-2.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}