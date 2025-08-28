# 📊 Ejemplos de Cálculo con Anticipo Mínimo

## 🎯 **Producto de Ejemplo**
- **Precio**: $100,000
- **Plan**: 12 cuotas
- **Recargo porcentual**: 15%
- **Recargo fijo**: $5,000

## 📈 **Cálculo SIN Anticipo (Estado Anterior)**

### Fórmula:
```
Precio con recargo = $100,000 × (1 + 15%) + $5,000 = $120,000
Cuota mensual = $120,000 ÷ 12 = $10,000
Total a pagar = $10,000 × 12 = $120,000
```

### Resultado:
- **Cuota mensual**: $10,000
- **Total a pagar**: $120,000
- **Anticipo**: $0

---

## 💰 **Cálculo CON Anticipo del 20% (Estado Actual)**

### Fórmula:
```
Precio con recargo = $100,000 × (1 + 15%) + $5,000 = $120,000
Monto anticipo = $120,000 × 20% = $24,000
Monto a financiar = $120,000 - $24,000 = $96,000
Cuota mensual = $96,000 ÷ 12 = $8,000
Total cuotas = $8,000 × 12 = $96,000
Total final = $24,000 + $96,000 = $120,000
```

### Resultado:
- **Anticipo**: $24,000 (20%)
- **Cuota mensual**: $8,000
- **Total cuotas**: $96,000
- **Total a pagar**: $120,000

---

## 💵 **Cálculo CON Anticipo Fijo de $30,000**

### Fórmula:
```
Precio con recargo = $100,000 × (1 + 15%) + $5,000 = $120,000
Monto anticipo fijo = $30,000
Monto a financiar = $120,000 - $30,000 = $90,000
Cuota mensual = $90,000 ÷ 12 = $7,500
Total cuotas = $7,500 × 12 = $90,000
Total final = $30,000 + $90,000 = $120,000
```

### Resultado:
- **Anticipo fijo**: $30,000
- **Cuota mensual**: $7,500
- **Total cuotas**: $90,000
- **Total a pagar**: $120,000

---

## 🔄 **Cálculo CON Ambos Tipos de Anticipo (20% + $10,000 fijo)**

### Fórmula:
```
Precio con recargo = $100,000 × (1 + 15%) + $5,000 = $120,000
Monto anticipo porcentual = $120,000 × 20% = $24,000
Monto anticipo fijo = $10,000
Monto anticipo total = $24,000 + $10,000 = $34,000
Monto a financiar = $120,000 - $34,000 = $86,000
Cuota mensual = $86,000 ÷ 12 = $7,167
Total cuotas = $7,167 × 12 = $86,000
Total final = $34,000 + $86,000 = $120,000
```

### Resultado:
- **Anticipo porcentual**: $24,000 (20%)
- **Anticipo fijo**: $10,000
- **Anticipo total**: $34,000
- **Cuota mensual**: $7,167
- **Total cuotas**: $86,000
- **Total a pagar**: $120,000

---

## ✅ **Beneficios del Nuevo Sistema**

1. **Cuotas más bajas**: $8,000 vs $10,000
2. **Flexibilidad**: El cliente puede elegir planes con o sin anticipo
3. **Transparencia**: Se muestra claramente el monto del anticipo
4. **Control**: Cada plan puede tener su propio porcentaje de anticipo

---

## 🔧 **Implementación Técnica**

### Función Actualizada:
```javascript
const calcularDetallesFinanciacion = (precio, cuotas, recargoPorcentual, recargoFijo, anticipoMinimo, anticipoMinimoFijo) => {
  const precioConRecargo = precio * (1 + recargoPorcentual / 100) + recargoFijo
  
  let montoAnticipo = 0
  let detallesAnticipo = {
    porcentual: 0,
    fijo: 0
  }
  
  // Calcular anticipo porcentual
  if (anticipoMinimo && anticipoMinimo > 0) {
    const anticipoPorcentual = precioConRecargo * (anticipoMinimo / 100)
    montoAnticipo += anticipoPorcentual
    detallesAnticipo.porcentual = anticipoPorcentual
  }
  
  // Calcular anticipo fijo
  if (anticipoMinimoFijo && anticipoMinimoFijo > 0) {
    montoAnticipo += anticipoMinimoFijo
    detallesAnticipo.fijo = anticipoMinimoFijo
  }
  
  if (montoAnticipo > 0) {
    const montoFinanciar = precioConRecargo - montoAnticipo
    const cuotaMensual = Math.round(montoFinanciar / cuotas)
    const totalCuotas = cuotaMensual * cuotas
    const totalFinal = montoAnticipo + totalCuotas
    
    return {
      precioConRecargo,
      montoAnticipo,
      montoFinanciar,
      cuotaMensual,
      totalCuotas,
      totalFinal,
      detallesAnticipo
    }
  }
  
  // Sin anticipo (comportamiento anterior)
  const cuotaMensual = Math.round(precioConRecargo / cuotas)
  const totalCuotas = cuotaMensual * cuotas
  
  return {
    precioConRecargo,
    montoAnticipo: 0,
    montoFinanciar: precioConRecargo,
    cuotaMensual,
    totalCuotas,
    totalFinal: totalCuotas,
    detallesAnticipo
  }
}
```

### Visualización en Tabla:
- **Columna Anticipo %**: Muestra el porcentaje y monto del anticipo porcentual
- **Columna Anticipo $**: Muestra el monto del anticipo fijo
- **Columna Cuota**: Muestra la cuota mensual y total final
- **Información clara**: El cliente ve exactamente qué debe pagar de cada tipo de anticipo
