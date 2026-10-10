import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return <aside className="update-toast" role="status"><p><strong>Nueva versión disponible</strong><span>Actualiza cuando hayas terminado tus formularios.</span></p><button className="button button-primary button-compact" type="button" onClick={() => void updateServiceWorker(true)}>Actualizar</button><button className="icon-button" type="button" aria-label="Cerrar aviso" onClick={() => setNeedRefresh(false)}>×</button></aside>
}
