"use client"

import { Package, CreditCard, Link2, BarChart3, Tag, Award, Settings, MapPin, Warehouse, Bot, Users, ShoppingCart, ChevronRight } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Configuracion } from "@/lib/supabase"
import Image from "next/image"

const menuItems = [
  {
    title: "Dashboard",
    icon: BarChart3,
    url: "#dashboard",
  },
  {
    title: "Productos",
    icon: Package,
    url: "#productos",
  },
  {
    title: "Categorías",
    icon: Tag,
    url: "#categorias",
  },
  {
    title: "Marcas",
    icon: Award,
    url: "#marcas",
  },
  {
    title: "Zonas/Sucursales",
    icon: MapPin,
    url: "#zonas",
  },
  {
    title: "Stock por Sucursales",
    icon: Warehouse,
    url: "#stock-sucursales",
  },
  {
    title: "Planes de Financiación",
    icon: CreditCard,
    url: "#planes",
  },
  {
    title: "Productos por Planes",
    icon: Link2,
    url: "#productos-planes",
  },
  {
    title: "Planes Especiales",
    icon: Link2,
    url: "#productos-plan",
  },
  {
    title: "Configuración Web",
    icon: Settings,
    url: "#configuracion",
  },
]

const agenteMenuItems = [
  {
    title: "Configuración del Agente",
    url: "#agente-configuracion",
  },
  {
    title: "Clientes",
    url: "#agente-clientes",
  },
  {
    title: "Pedidos",
    url: "#agente-pedidos",
  },
]

interface AppSidebarProps {
  configuracion?: Configuracion | null
  activeSection?: string
}

export function AppSidebar({ configuracion, activeSection = "dashboard" }: AppSidebarProps) {
  const titulo = configuracion?.titulo || "Dashboard"
  const subtitulo = configuracion?.subtitulo || "Panel Admin"
  const logo = configuracion?.logo
  
  const getActiveSection = (url: string) => {
    return url.replace("#", "")
  }
  
  const isAgenteSection = (section: string) => {
    return section.startsWith("agente-")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-2">
          {logo ? (
            <div className="flex h-8 w-8 items-center justify-center">
              <Image
                src={logo}
                alt="Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CreditCard className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-lg font-semibold">{titulo}</span>
            <span className="text-xs text-muted-foreground">{subtitulo}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = getActiveSection(item.url) === activeSection
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <a href={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <Collapsible defaultOpen={isAgenteSection(activeSection)}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      className="flex items-center gap-2"
                      isActive={isAgenteSection(activeSection)}
                    >
                      <Bot className="h-4 w-4" />
                      <span>Agente</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {agenteMenuItems.map((item) => {
                        const isActive = getActiveSection(item.url) === activeSection
                        return (
                          <SidebarMenuSubItem key={item.title}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <a href={item.url} className="flex items-center gap-2">
                                <span>{item.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
