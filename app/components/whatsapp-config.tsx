"use client"

import { useState, useEffect } from "react"
import { Settings, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface WhatsAppConfigProps {
  configuracion: any
  onUpdateConfiguracion: (telefono: string) => Promise<any>
}

export function WhatsAppConfig({ configuracion, onUpdateConfiguracion }: WhatsAppConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Cargar el número guardado al iniciar
  useEffect(() => {
    if (configuracion?.telefono) {
      setWhatsappNumber(configuracion.telefono)
    }
  }, [configuracion])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Guardar en la base de datos
      await onUpdateConfiguracion(whatsappNumber)
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error al guardar número de WhatsApp:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (number: string) => {
    // Remover todos los caracteres no numéricos
    const cleanNumber = number.replace(/\D/g, "")
    
    // Si empieza con 0, removerlo
    if (cleanNumber.startsWith("0")) {
      return cleanNumber.substring(1)
    }
    
    // Si empieza con 54, mantenerlo
    if (cleanNumber.startsWith("54")) {
      return cleanNumber
    }
    
    // Si no empieza con 54, agregarlo
    return `54${cleanNumber}`
  }

  const handleNumberChange = (value: string) => {
    const formatted = formatNumber(value)
    setWhatsappNumber(formatted)
  }

  const getDisplayNumber = () => {
    if (!whatsappNumber) return "No configurado"
    
    // Formatear para mostrar: +54 9 11 1234-5678
    const formatted = whatsappNumber.replace(/(\d{2})(\d{1})(\d{2})(\d{4})(\d{4})/, "+$1 $2 $3 $4-$5")
    return formatted
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Configuración de WhatsApp
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurar Número de WhatsApp</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="whatsappNumber">Número de WhatsApp</Label>
                  <Input
                    id="whatsappNumber"
                    type="tel"
                    placeholder="Ej: 91112345678"
                    value={whatsappNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ingresa el número sin el código de país (+54). Se formateará automáticamente.
                  </p>
                </div>
                {whatsappNumber && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Número formateado:</p>
                    <p className="text-lg font-mono">{getDisplayNumber()}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading || !whatsappNumber}>
                  {isLoading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Número actual:</span>
              <span className="font-medium">{getDisplayNumber()}</span>
            </div>
            <div className="text-xs text-gray-500">
              Este número se usará para redirigir a los clientes cuando consulten por WhatsApp.
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
