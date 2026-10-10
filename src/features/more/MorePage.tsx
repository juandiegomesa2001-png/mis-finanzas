import { useRef, useState, type ChangeEvent } from "react";
import {
  CalendarClock,
  ChevronRight,
  Download,
  Landmark,
  Moon,
  Settings,
  Sun,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useFinanceData } from "../../app/FinanceDataContext";
import { ErrorMessage, SuccessMessage } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import {
  backupService,
  type RestoreAnalysis,
} from "../../services/backupService";
import { financeService } from "../../services/financeService";
import { formatMoney } from "../../utils/money";
import { toMoneyAmount } from "../../domain";

export function MorePage() {
  const { data } = useFinanceData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState<{
    payload: unknown;
    analysis: RestoreAnalysis;
  }>();
  const [busy, setBusy] = useState(false);
  async function exportBackup() {
    setBusy(true);
    setError("");
    try {
      const backup = await backupService.createBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `mis-finanzas-respaldo-${backup.exportedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccess("Respaldo completo validado y listo para guardar.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No fue posible exportar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");
    try {
      const payload: unknown = JSON.parse(await file.text());
      const analysis = await backupService.analyzeRestore(payload);
      setPending({ payload, analysis });
    } catch (caught) {
      setPending(undefined);
      setError(
        caught instanceof Error
          ? `Respaldo rechazado: ${caught.message}`
          : "El respaldo no es válido.",
      );
    } finally {
      event.target.value = "";
    }
  }
  async function restore(replace: boolean) {
    if (!pending) return;
    setBusy(true);
    try {
      await backupService.restore(
        pending.payload,
        replace ? "replace-local" : "keep-local",
      );
      setSuccess(
        `Restauración completada: ${pending.analysis.newRecords} nuevos, ${pending.analysis.identicalRecords} duplicados omitidos y ${pending.analysis.conflicts.length} conflictos ${replace ? "reemplazados" : "conservados localmente"}.`,
      );
      setPending(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No fue posible restaurar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggleTheme() {
    try {
      await financeService.setTheme(
        (data.settings?.theme ?? "dark") === "dark" ? "light" : "dark",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible cambiar el tema.",
      );
    }
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Configuración"
        title="Más"
        description="Obligaciones, cuentas, preferencias y recuperación."
      />
      {error ? <ErrorMessage message={error} /> : null}
      {success ? <SuccessMessage message={success} /> : null}
      <section className="menu-section">
        <h2>Administración</h2>
        <Link className="menu-row" to="/accounts">
          <span className="menu-icon">
            <Landmark size={19} />
          </span>
          <span>
            <strong>Cuentas</strong>
            <small>Crear, editar, archivar y consultar saldos</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <Link className="menu-row" to="/obligations">
          <span className="menu-icon">
            <CalendarClock size={19} />
          </span>
          <span>
            <strong>Obligaciones y suscripciones</strong>
            <small>Servicios, gastos fijos y cobros recurrentes</small>
          </span>
          <ChevronRight size={18} />
        </Link>
        <Link className="menu-row" to="/onboarding">
          <span className="menu-icon">
            <Settings size={19} />
          </span>
          <span>
            <strong>Configuración inicial</strong>
            <small>Completar moneda, cuenta e ingreso habitual</small>
          </span>
          <ChevronRight size={18} />
        </Link>
      </section>
      <section className="menu-section">
        <h2>Preferencias</h2>
        <button
          className="menu-row menu-button"
          type="button"
          onClick={() => void toggleTheme()}
        >
          <span className="menu-icon">
            {(data.settings?.theme ?? "dark") === "dark" ? (
              <Sun size={19} />
            ) : (
              <Moon size={19} />
            )}
          </span>
          <span>
            <strong>
              Tema{" "}
              {(data.settings?.theme ?? "dark") === "dark" ? "claro" : "oscuro"}
            </strong>
            <small>Cambiar la apariencia en este dispositivo</small>
          </span>
          <ChevronRight size={18} />
        </button>
      </section>
      <section className="menu-section">
        <h2>Ingresos programados</h2>
        {data.incomeSchedules.length === 0 ? (
          <p className="muted-copy">No hay ingresos programados.</p>
        ) : (
          data.incomeSchedules.map((item) => (
            <article className="schedule-row" key={item.id}>
              <CalendarClock size={19} />
              <div>
                <strong>{item.name}</strong>
                <span>Previsto, no disponible: {item.nextEstimatedDate}</span>
              </div>
              <strong>
                {formatMoney(toMoneyAmount(item.amount), item.currency)}
              </strong>
            </article>
          ))
        )}
      </section>
      <section className="menu-section">
        <h2>Respaldo y restauración</h2>
        <div className="backup-card">
          <p>
            La restauración valida todo antes de escribir y nunca vacía la base
            local.
          </p>
          <div className="card-actions">
            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={() => void exportBackup()}
            >
              <Download size={17} /> Exportar JSON
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={17} /> Validar archivo
            </button>
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => void selectBackup(event)}
          />
        </div>
        {pending ? (
          <div className="panel">
            <h2>Validación completada</h2>
            <p>
              {pending.analysis.newRecords} registros nuevos ·{" "}
              {pending.analysis.identicalRecords} duplicados idénticos ·{" "}
              {pending.analysis.conflicts.length} conflictos.
            </p>
            <div className="card-actions">
              <button
                className="button button-primary"
                onClick={() => void restore(false)}
              >
                Restaurar y conservar locales
              </button>
              {pending.analysis.conflicts.length ? (
                <button
                  className="button button-danger-ghost"
                  onClick={() => {
                    if (
                      window.confirm(
                        "¿Reemplazar los registros locales en conflicto? Esta decisión no se puede deshacer desde la aplicación.",
                      )
                    )
                      void restore(true);
                  }}
                >
                  Reemplazar conflictos
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <p className="form-hint">
          IndexedDB puede perderse al eliminar la app o sus datos. Guarda copias
          periódicas en Archivos o iCloud Drive.
        </p>
      </section>
    </div>
  );
}
