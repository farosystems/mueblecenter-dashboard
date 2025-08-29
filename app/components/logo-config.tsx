"use client"

import { useState, useEffect } from "react"
import { Settings, Upload, X, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Configuracion } from "@/lib/supabase"
import Image from "next/image"

interface LogoConfigProps {
  configuracion: Configuracion | null
  onUpdateConfiguracion: (updates: Partial<Pick<Configuracion, 'logo'>>) => Promise<any>
}

export function LogoConfig({ configuracion, onUpdateConfiguracion }: LogoConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')

  useEffect(() => {
    if (configuracion) {
      setLogoUrl(configuracion.logo || "")
    }
  }, [configuracion])

  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${fileExt}`
    const filePath = `logos/${fileName}`

    const { data, error } = await supabase.storage
      .from('imagenes')
      .upload(filePath, file)

    if (error) {
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona solo archivos de imagen')
      return
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      alert('El archivo es muy grande. Máximo 2MB para logos')
      return
    }

    setIsLoading(true)
    try {
      const url = await uploadImageToSupabase(file)
      setLogoUrl(url)
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error al subir el logo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const updates = {
        logo: logoUrl || null
      }
      await onUpdateConfiguracion(updates)
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error al guardar configuración:', error)
      alert('Error al guardar la configuración')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl("")
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Logo del Sistema
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Configurar Logo del Sistema</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Logo</Label>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={uploadMode === 'file' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUploadMode('file')}
                    >
                      Subir archivo
                    </Button>
                    <Button
                      variant={uploadMode === 'url' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUploadMode('url')}
                    >
                      URL de imagen
                    </Button>
                  </div>

                  {uploadMode === 'file' ? (
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragOver
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragOver(true)
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                    >
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Arrastra tu logo aquí
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        o haz clic para seleccionar
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Subiendo...' : 'Seleccionar archivo'}
                      </Button>
                      <p className="text-xs text-gray-400 mt-2">
                        Máximo 2MB. Formatos: JPG, PNG, SVG
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="logoUrl">URL del logo</Label>
                      <Input
                        id="logoUrl"
                        type="url"
                        placeholder="https://ejemplo.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}

                  {logoUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Vista previa del logo:</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>
                      <div className="flex items-center justify-center border rounded-lg p-6 bg-gray-50">
                        <Image
                          src={logoUrl}
                          alt="Vista previa del logo"
                          width={120}
                          height={120}
                          className="max-w-32 max-h-32 object-contain"
                          onError={() => {
                            console.error('Error loading logo preview')
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {configuracion?.logo ? (
              <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
                <Image
                  src={configuracion.logo}
                  alt="Logo actual"
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain"
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="mx-auto w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center mb-3">
                  <ImageIcon className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-sm">No hay logo configurado</p>
                <p className="text-xs">Haz clic en "Configurar" para agregar tu logo</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}