"use client"

import { useState, useEffect } from "react"
import { Settings, Upload, X, Image as ImageIcon, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { ConfiguracionWeb } from "@/lib/supabase"
import Image from "next/image"

interface BannerConfigProps {
  configuracionWeb: ConfiguracionWeb | null
  onUpdateConfiguracionWeb: (updates: Partial<Pick<ConfiguracionWeb, 'banner' | 'banner_2' | 'banner_3' | 'banner_principal' | 'banner_link' | 'banner_2_link' | 'banner_3_link' | 'seccion_bienvenidos'>>) => Promise<any>
}

type BannerKey = 'banner' | 'banner_2' | 'banner_3' | 'banner_principal'

interface BannerState {
  url: string
  link: string
  isDragOver: boolean
  isLoading: boolean
}

export function BannerConfig({ configuracionWeb, onUpdateConfiguracionWeb }: BannerConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file')
  const [activeBanner, setActiveBanner] = useState<BannerKey>('banner')
  
  const [banners, setBanners] = useState<Record<BannerKey, BannerState>>({
    banner: { url: "", link: "", isDragOver: false, isLoading: false },
    banner_2: { url: "", link: "", isDragOver: false, isLoading: false },
    banner_3: { url: "", link: "", isDragOver: false, isLoading: false },
    banner_principal: { url: "", link: "", isDragOver: false, isLoading: false }
  })

  useEffect(() => {
    if (configuracionWeb) {
      setBanners({
        banner: {
          url: configuracionWeb.banner || "",
          link: configuracionWeb.banner_link || "",
          isDragOver: false,
          isLoading: false
        },
        banner_2: {
          url: configuracionWeb.banner_2 || "",
          link: configuracionWeb.banner_2_link || "",
          isDragOver: false,
          isLoading: false
        },
        banner_3: {
          url: configuracionWeb.banner_3 || "",
          link: configuracionWeb.banner_3_link || "",
          isDragOver: false,
          isLoading: false
        },
        banner_principal: {
          url: configuracionWeb.banner_principal || "",
          link: "",
          isDragOver: false,
          isLoading: false
        }
      })
    }
  }, [configuracionWeb])

  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `banner-${activeBanner}-${Date.now()}.${fileExt}`
    const filePath = `imagenes_web/${fileName}`

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

  const updateBannerState = (bannerKey: BannerKey, updates: Partial<BannerState>) => {
    setBanners(prev => ({
      ...prev,
      [bannerKey]: { ...prev[bannerKey], ...updates }
    }))
  }

  const handleFileUpload = async (file: File, bannerKey: BannerKey) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona solo archivos de imagen')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      alert('El archivo es muy grande. Máximo 5MB')
      return
    }

    updateBannerState(bannerKey, { isLoading: true })
    try {
      const url = await uploadImageToSupabase(file)
      updateBannerState(bannerKey, { url, isLoading: false })
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen')
      updateBannerState(bannerKey, { isLoading: false })
    }
  }

  const handleDrop = (e: React.DragEvent, bannerKey: BannerKey) => {
    e.preventDefault()
    updateBannerState(bannerKey, { isDragOver: false })
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file, bannerKey)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, bannerKey: BannerKey) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, bannerKey)
    }
  }

  const handleUrlChange = (url: string, bannerKey: BannerKey) => {
    updateBannerState(bannerKey, { url })
  }

  const handleSave = async () => {
    const updates: Partial<Pick<ConfiguracionWeb, 'banner' | 'banner_2' | 'banner_3' | 'banner_principal' | 'banner_link' | 'banner_2_link' | 'banner_3_link'>> = {
      banner: banners.banner.url || null,
      banner_2: banners.banner_2.url || null,
      banner_3: banners.banner_3.url || null,
      banner_principal: banners.banner_principal.url || null,
      banner_link: banners.banner.link || null,
      banner_2_link: banners.banner_2.link || null,
      banner_3_link: banners.banner_3.link || null
    }

    try {
      await onUpdateConfiguracionWeb(updates)
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error al guardar banners:', error)
      alert('Error al guardar los banners')
    }
  }

  const handleUrlSubmit = async (bannerKey: BannerKey) => {
    if (!banners[bannerKey].url) return

    updateBannerState(bannerKey, { isLoading: true })
    
    try {
      const updates: Partial<Pick<ConfiguracionWeb, 'banner' | 'banner_2' | 'banner_3' | 'banner_principal'>> = {}
      updates[bannerKey] = banners[bannerKey].url

      await onUpdateConfiguracionWeb(updates)
    } catch (error) {
      console.error(`Error al guardar ${getBannerName(bannerKey)}:`, error)
      alert(`Error al guardar ${getBannerName(bannerKey)}`)
    } finally {
      updateBannerState(bannerKey, { isLoading: false })
    }
  }

  const handleRemoveBanner = async (bannerKey: BannerKey) => {
    try {
      const updates: Partial<Pick<ConfiguracionWeb, 'banner' | 'banner_2' | 'banner_3' | 'banner_principal'>> = {}
      updates[bannerKey] = null

      await onUpdateConfiguracionWeb(updates)
      updateBannerState(bannerKey, { url: "" })
    } catch (error) {
      console.error(`Error al eliminar ${getBannerName(bannerKey)}:`, error)
      alert(`Error al eliminar ${getBannerName(bannerKey)}`)
    }
  }

  const getBannerName = (key: BannerKey) => {
    switch (key) {
      case 'banner': return 'Banner 1'
      case 'banner_2': return 'Banner 2' 
      case 'banner_3': return 'Banner 3'
      case 'banner_principal': return 'Banner Principal'
      default: return 'Banner'
    }
  }

  const getActiveBanners = () => {
    return Object.entries(banners).filter(([_, state]) => state.url).length
  }

  const renderBannerTab = (bannerKey: BannerKey) => {
    const bannerState = banners[bannerKey]

    return (
      <div className="space-y-4">
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
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              bannerState.isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              updateBannerState(bannerKey, { isDragOver: true })
            }}
            onDragLeave={() => updateBannerState(bannerKey, { isDragOver: false })}
            onDrop={(e) => handleDrop(e, bannerKey)}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-600 mb-2">
              Arrastra y suelta una imagen aquí
            </p>
            <p className="text-sm text-gray-500 mb-4">
              o haz clic para seleccionar
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, bannerKey)}
              className="hidden"
              id={`banner-upload-${bannerKey}`}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById(`banner-upload-${bannerKey}`)?.click()}
              disabled={bannerState.isLoading}
            >
              {bannerState.isLoading ? 'Subiendo...' : 'Seleccionar archivo'}
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              Tamaño máximo: 5MB. Formatos: JPG, PNG, GIF, WebP
            </p>
          </div>
        ) : (
          <div>
            <Label htmlFor={`bannerUrl-${bannerKey}`}>URL de la imagen</Label>
            <Input
              id={`bannerUrl-${bannerKey}`}
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              value={bannerState.url}
              onChange={(e) => handleUrlChange(e.target.value, bannerKey)}
              className="mt-1"
            />
          </div>
        )}

        {/* Campo para URL de redirección - Solo para banner, banner_2 y banner_3 */}
        {bannerKey !== 'banner_principal' && (
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor={`bannerLink-${bannerKey}`}>URL de redirección (opcional)</Label>
            <Input
              id={`bannerLink-${bannerKey}`}
              type="url"
              placeholder="https://ejemplo.com/pagina-destino"
              value={bannerState.link}
              onChange={(e) => updateBannerState(bannerKey, { link: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              El banner redirigirá a esta URL cuando se haga clic en él
            </p>
          </div>
        )}

        {bannerState.url && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Vista previa:</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveBanner(bannerKey)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                Remover
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-gray-50">
              <Image
                src={bannerState.url}
                alt={`Vista previa del ${getBannerName(bannerKey)}`}
                width={500}
                height={180}
                className="w-full h-36 object-contain"
                onError={() => {
                  console.error('Error loading image preview')
                }}
              />
            </div>
            {bannerState.link && bannerKey !== 'banner_principal' && (
              <p className="text-xs text-gray-600">
                🔗 Redirige a: <span className="text-blue-600 break-all">{bannerState.link}</span>
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Banners de la Home
            {getActiveBanners() > 0 && (
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {getActiveBanners()}/3
              </span>
            )}
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configurar Banners de la Home (máximo 3)</DialogTitle>
              </DialogHeader>
              
              <Tabs value={activeBanner} onValueChange={(value) => setActiveBanner(value as BannerKey)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="banner" className="flex items-center gap-2">
                    Banner 1
                    {banners.banner.url && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                  </TabsTrigger>
                  <TabsTrigger value="banner_2" className="flex items-center gap-2">
                    Banner 2
                    {banners.banner_2.url && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                  </TabsTrigger>
                  <TabsTrigger value="banner_3" className="flex items-center gap-2">
                    Banner 3
                    {banners.banner_3.url && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="banner">
                  {renderBannerTab('banner')}
                </TabsContent>
                
                <TabsContent value="banner_2">
                  {renderBannerTab('banner_2')}
                </TabsContent>
                
                <TabsContent value="banner_3">
                  {renderBannerTab('banner_3')}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Guardar Banners
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getActiveBanners() > 0 ? (
              <div className="space-y-3">
                {Object.entries(banners).map(([key, state]) => {
                  if (!state.url) return null
                  
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-700">
                          {getBannerName(key as BannerKey)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBanner(key as BannerKey)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden bg-gray-50">
                        <Image
                          src={state.url}
                          alt={`${getBannerName(key as BannerKey)} actual`}
                          width={800}
                          height={160}
                          className="w-full h-20 object-cover"
                        />
                      </div>
                      <p className="text-xs text-gray-500 break-all">
                        {state.url}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>No hay banners configurados</p>
                <p className="text-sm">Haz clic en "Configurar" para agregar hasta 3 banners</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banner Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Banner Principal
            {banners.banner_principal.url && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {banners.banner_principal.url ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">
                    Banner Principal Actual
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveBanner('banner_principal')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <Image
                    src={banners.banner_principal.url}
                    alt="Banner Principal actual"
                    width={800}
                    height={200}
                    className="w-full h-32 object-cover"
                  />
                </div>
                <p className="text-xs text-gray-500 break-all">
                  {banners.banner_principal.url}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>No hay banner principal configurado</p>
              </div>
            )}

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Subir nuevo banner principal</h4>
              
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
                  URL externa
                </Button>
              </div>

              {uploadMode === 'file' ? (
                <div className="space-y-2">
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      banners.banner_principal.isDragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      updateBannerState('banner_principal', { isDragOver: true })
                    }}
                    onDragLeave={() => {
                      updateBannerState('banner_principal', { isDragOver: false })
                    }}
                    onDrop={(e) => handleDrop(e, 'banner_principal')}
                  >
                    {banners.banner_principal.isLoading ? (
                      <div className="space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-sm text-gray-600">Subiendo imagen...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Arrastra una imagen aquí o{' '}
                          <label className="text-blue-500 hover:text-blue-600 cursor-pointer underline">
                            selecciona un archivo
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileSelect(e, 'banner_principal')}
                              className="hidden"
                            />
                          </label>
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG, JPG, GIF hasta 10MB. Recomendado: 1200x300px
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="url-input">URL de la imagen</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={banners.banner_principal.url}
                      onChange={(e) => updateBannerState('banner_principal', { url: e.target.value })}
                    />
                    <Button 
                      onClick={() => handleUrlSubmit('banner_principal')}
                      disabled={!banners.banner_principal.url || banners.banner_principal.isLoading}
                    >
                      {banners.banner_principal.isLoading ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección Bienvenidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Sección Bienvenidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="seccion-bienvenidos">Mostrar sección de bienvenidos en la Home</Label>
              <p className="text-sm text-gray-500">
                Activa o desactiva la sección de bienvenidos en la página principal
              </p>
            </div>
            <Switch
              id="seccion-bienvenidos"
              checked={configuracionWeb?.seccion_bienvenidos ?? true}
              onCheckedChange={async (checked) => {
                try {
                  await onUpdateConfiguracionWeb({ seccion_bienvenidos: checked })
                } catch (error) {
                  console.error('Error al actualizar sección bienvenidos:', error)
                  alert('Error al actualizar la configuración')
                }
              }}
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}