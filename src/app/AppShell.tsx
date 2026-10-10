import { ArrowLeftRight, ChartNoAxesCombined, CreditCard, Home, MoreHorizontal, Plus } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

import { PwaUpdatePrompt } from '../components/PwaUpdatePrompt'

function navClass({ isActive }: { readonly isActive: boolean }): string { return isActive ? 'nav-link nav-link-active' : 'nav-link' }

export function AppShell() {
  return <div className="app-shell"><main className="app-main"><Outlet /></main><NavLink className="expense-fab" to="/expense" aria-label="Registrar gasto"><Plus aria-hidden="true" size={26}/></NavLink><nav className="bottom-nav" aria-label="Navegación principal"><NavLink className={navClass} to="/" end><Home size={21}/><span>Inicio</span></NavLink><NavLink className={navClass} to="/movements"><ArrowLeftRight size={21}/><span>Movimientos</span></NavLink><NavLink className={navClass} to="/cards"><CreditCard size={21}/><span>Tarjetas</span></NavLink><NavLink className={navClass} to="/plan"><ChartNoAxesCombined size={21}/><span>Plan</span></NavLink><NavLink className={navClass} to="/more"><MoreHorizontal size={21}/><span>Más</span></NavLink></nav><PwaUpdatePrompt /></div>
}
