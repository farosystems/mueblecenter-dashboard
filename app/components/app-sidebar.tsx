"use client"

import { Package, CreditCard, Link2, BarChart3, Tag, Award, Settings, MapPin } from "lucide-react"
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
  SidebarRail,
} from "@/components/ui/sidebar"

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
    title: "Zonas",
    icon: MapPin,
    url: "#zonas",
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
    title: "Configuración",
    icon: Settings,
    url: "#configuracion",
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">Dashboard</span>
            <span className="text-xs text-muted-foreground">Panel Admin</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
