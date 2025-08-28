// Utilidades para WhatsApp

export const getWhatsAppNumber = (configuracion?: any): string => {
  if (!configuracion?.telefono) return ''
  return configuracion.telefono
}

export const generateWhatsAppLink = (productDescription?: string, configuracion?: any): string => {
  const number = getWhatsAppNumber(configuracion)
  if (!number) {
    console.warn('Número de WhatsApp no configurado')
    return '#'
  }

  const baseMessage = "Hola! Me interesa consultar sobre un producto."
  const productMessage = productDescription 
    ? `${baseMessage}\n\nProducto: ${productDescription}`
    : baseMessage

  const encodedMessage = encodeURIComponent(productMessage)
  return `https://wa.me/${number}?text=${encodedMessage}`
}

export const openWhatsApp = (productDescription?: string, configuracion?: any) => {
  const link = generateWhatsAppLink(productDescription, configuracion)
  if (link !== '#') {
    window.open(link, '_blank')
  } else {
    alert('Por favor, configura el número de WhatsApp en la sección de Configuración.')
  }
}
