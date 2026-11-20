'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminPanel() {
  const [condominios, setCondominios] = useState<any[]>([])
  const [condoId, setCondoId] = useState('')
  const [tasaBcv, setTasaBcv] = useState('')
  const [inmuebles, setInmuebles] = useState<any[]>([])
  const [pagosPendientes, setPagosPendientes] = useState<any[]>([])
  const [mensaje, setMensaje] = useState('')

  // Estados para crear nuevo recibo
  const [inmuebleRecibo, setInmuebleRecibo] = useState('')
  const [mesAnio, setMesAnio] = useState('Diciembre 2026')
  const [concepto, setConcepto] = useState('Cuota ordinaria de condominio')
  const [montoUsd, setMontoUsd] = useState('')

  useEffect(() => {
    cargarCondominios()
  }, [])

  async function cargarCondominios() {
    const { data } = await supabase.from('condominios').select('*')
    if (data) setCondominios(data)
  }

  async function seleccionarCondominio(id: string) {
    setCondoId(id)
    setMensaje('')
    const condo = condominios.find(c => c.id === id)
    if (condo) setTasaBcv(condo.tasa_bcv.toString())

    if (id) {
      // Cargar inmuebles del condominio
      const { data: inmData } = await supabase
        .from('inmuebles')
        .select('*')
        .eq('condominio_id', id)
      if (inmData) setInmuebles(inmData)

      cargarPagosPendientes(id)
    }
  }

  async function cargarPagosPendientes(idCondo: string) {
    // Traer pagos pendientes junto con la info del recibo y del inmueble
    const { data } = await supabase
      .from('pagos')
      .select(`
        *,
        recibos (
          id, mes_anio, monto_usd,
          inmuebles ( id, identificador, propietario_nombre, condominio_id )
        )
      `)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })

    if (data) {
      // Filtrar solo los que pertenecen a este condominio
      const filtrados = data.filter(p => p.recibos?.inmuebles?.condominio_id === idCondo)
      setPagosPendientes(filtrados)
    }
  }

  async function actualizarTasa(e: React.FormEvent) {
    e.preventDefault()
    if (!condoId || !tasaBcv) return
    const { error } = await supabase
      .from('condominios')
      .update({ tasa_bcv: Number(tasaBcv) })
      .eq('id', condoId)

    if (!error) {
      setMensaje(`Tasa BCV actualizada a Bs. ${tasaBcv}`)
      cargarCondominios()
    }
  }

  async function gestionarPago(pagoId: string, reciboId: string, accion: 'aprobado' | 'rechazado') {
    await supabase.from('pagos').update({ estado: accion }).eq('id', pagoId)
    
    const nuevoEstadoRecibo = accion === 'aprobado' ? 'pagado' : 'pendiente'
    await supabase.from('recibos').update({ estado: nuevoEstadoRecibo }).eq('id', reciboId)

    setMensaje(`Pago ${accion} correctamente.`)
    cargarPagosPendientes(condoId)
  }

  async function crearRecibo(e: React.FormEvent) {
    e.preventDefault()
    if (!inmuebleRecibo || !montoUsd) return

    const { error } = await supabase.from('recibos').insert({
      inmueble_id: inmuebleRecibo,
      mes_anio: mesAnio,
      concepto,
      monto_usd: Number(montoUsd),
      estado: 'pendiente'
    })

    if (!error) {
      setMensaje('¡Nuevo recibo emitido con éxito!')
      setMontoUsd('')
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
            <p className="text-sm text-slate-500">Gestiona recibos, tasa BCV y aprueba pagos</p>
          </div>
          <a href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            ← Ir a vista de Vecinos
          </a>
        </div>

        {/* Selector de Condominio */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold mb-2">Selecciona el Condominio a administrar</label>
          <select 
            className="w-full p-3 border border-slate-300 rounded-xl bg-white"
            value={condoId}
            onChange={(e) => seleccionarCondominio(e.target.value)}
          >
            <option value="" disabled>-- Elige un condominio --</option>
            {condominios.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} ({c.ciudad})</option>
            ))}
          </select>
        </div>

        {mensaje && (
          <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-sm font-medium">
            {mensaje}
          </div>
        )}

        {condoId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actualizar Tasa BCV */}
            <form onSubmit={actualizarTasa} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-bold">Tasa BCV del Condominio</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Tasa actual (Bs. por $1)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-2.5 border rounded-lg"
                  value={tasaBcv}
                  onChange={(e) => setTasaBcv(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-sm font-semibold">
                Actualizar Tasa
              </button>
            </form>

            {/* Emitir Nuevo Recibo */}
            <form onSubmit={crearRecibo} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
              <h2 className="text-lg font-bold">Emitir Nuevo Recibo</h2>
              <select 
                required
                className="w-full p-2.5 border rounded-lg text-sm bg-white"
                value={inmuebleRecibo}
                onChange={(e) => setInmuebleRecibo(e.target.value)}
              >
                <option value="" disabled>-- Selecciona apartamento --</option>
                {inmuebles.map(i => (
                  <option key={i.id} value={i.id}>{i.identificador} - {i.propietario_nombre}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" required placeholder="Mes (Ej: Dic 2026)"
                  className="p-2.5 border rounded-lg text-sm"
                  value={mesAnio} onChange={(e) => setMesAnio(e.target.value)}
                />
                <input 
                  type="number" step="0.01" required placeholder="Monto USD ($)"
                  className="p-2.5 border rounded-lg text-sm"
                  value={montoUsd} onChange={(e) => setMontoUsd(e.target.value)}
                />
              </div>
              <input 
                type="text" required placeholder="Concepto"
                className="w-full p-2.5 border rounded-lg text-sm"
                value={concepto} onChange={(e) => setConcepto(e.target.value)}
              />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold">
                Emitir Recibo
              </button>
            </form>
          </div>
        )}

        {/* Pagos por Aprobar */}
        {condoId && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4">Pagos por Revisar ({pagosPendientes.length})</h2>
            {pagosPendientes.length === 0 ? (
              <p className="text-sm text-slate-500">No hay pagos pendientes por revisar en este momento.</p>
            ) : (
              <div className="space-y-3">
                {pagosPendientes.map(p => (
                  <div key={p.id} className="p-4 border rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-800">
                        {p.recibos?.inmuebles?.identificador} ({p.recibos?.inmuebles?.propietario_nombre})
                      </p>
                      <p className="text-xs text-slate-500">
                        Recibo: {p.recibos?.mes_anio} | Método: <strong>{p.metodo}</strong> | Ref: <strong>{p.referencia}</strong>
                      </p>
                      <p className="text-sm font-semibold text-blue-600 mt-1">
                        Reportado: {p.moneda} {p.monto_pagado}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => gestionarPago(p.id, p.recibos.id, 'aprobado')}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        Aprobar
                      </button>
                      <button 
                        onClick={() => gestionarPago(p.id, p.recibos.id, 'rechazado')}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}