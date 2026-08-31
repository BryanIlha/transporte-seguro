import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  LockKeyhole,
  MapPin,
  Phone,
  RefreshCw,
  BusFront,
  ShieldCheck,
  Snowflake,
  Users,
  Wrench,
} from "lucide-react";
import logo from "@/assets/01transportes-logo.svg";
import maintenance from "@/assets/maintenance.jpg";
import van from "@/assets/vehicle-van.jpg";
import { WHATSAPP_LABEL, WHATSAPP_NUMBER, whatsappLink as waLink } from "@/lib/contact";
import { availabilityLabel, operationModeLabel, type CatalogVehicle } from "@/lib/catalog";
import { getCatalogVehicles } from "@/lib/catalog-api";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "01 Transportes — Transporte escolar, locação e venda de veículos" },
      {
        name: "description",
        content:
          "Frota escolar e comercial revisada, documentação em dia e atendimento direto pelo WhatsApp. Locação, venda e montagem de veículos conforme a sua necessidade.",
      },
      { property: "og:title", content: "01 Transportes — Transporte escolar e frota comercial" },
      {
        property: "og:description",
        content: "Locação e venda de veículos com frota revisada e documentação em dia.",
      },
    ],
  }),
});

type Vehicle = {
  id: string;
  name: string;
  category: string;
  description: string;
  capacity: string;
  equipment: string[];
  status: string;
  mode: string;
  price: string | null;
  airConditioned: boolean;
  location: string | null;
  year: number | null;
  image: string | null;
  alt: string;
};

function getCatalogFallbackFeatures(vehicle: CatalogVehicle) {
  return [
    vehicle.brand && vehicle.model
      ? `${vehicle.brand} ${vehicle.model}`
      : (vehicle.model ?? vehicle.brand),
    vehicle.manufactured_year ? `Ano ${vehicle.manufactured_year}` : null,
    vehicle.location,
  ].filter((value): value is string => Boolean(value));
}

function formatCatalogPrice(priceCents: number | null) {
  if (priceCents === null) return null;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

function toDisplayVehicle(vehicle: CatalogVehicle): Vehicle {
  const images = [...(vehicle.catalog_vehicle_images ?? [])].sort(
    (first, second) => first.sort_order - second.sort_order,
  );
  const primaryImage = images[0];
  const features =
    vehicle.features.length > 0 ? vehicle.features : getCatalogFallbackFeatures(vehicle);

  return {
    id: vehicle.id,
    name: vehicle.title,
    category: vehicle.category,
    description: vehicle.description,
    capacity: vehicle.passenger_capacity
      ? `${vehicle.passenger_capacity} passageiros`
      : "Capacidade sob consulta",
    equipment: features.length > 0 ? features : ["Detalhes disponíveis sob consulta"],
    status: availabilityLabel[vehicle.availability],
    mode: operationModeLabel[vehicle.operation_mode],
    price: formatCatalogPrice(vehicle.price_cents),
    airConditioned: vehicle.air_conditioned,
    location: vehicle.location,
    year: vehicle.manufactured_year,
    image: primaryImage?.path ?? null,
    alt: primaryImage?.alt_text ?? vehicle.title,
  };
}

function usePublishedVehicles() {
  return useQuery({
    queryKey: ["public-catalog"],
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      const timeout = setTimeout(abort, 15_000);
      try {
        return (await getCatalogVehicles(controller.signal)).map(toDisplayVehicle);
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

const services = [
  {
    icon: Users,
    title: "Transporte escolar",
    text: "Atendimento a escolas e famílias, com motoristas habilitados e veículos vistoriados dentro das exigências do DETRAN.",
  },
  {
    icon: BadgeCheck,
    title: "Locação de veículos",
    text: "Vans, micro-ônibus e ônibus para fretamento, eventos, transporte corporativo e demandas institucionais.",
  },
  {
    icon: FileCheck,
    title: "Venda de veículos",
    text: "Frota revisada, com documentação regular e histórico de manutenção disponível para consulta.",
  },
];

const trust = [
  { icon: ShieldCheck, label: "Vistoria e documentação em dia" },
  { icon: Wrench, label: "Manutenção preventiva em oficina própria" },
  { icon: Clock, label: "Resposta comercial em até 1 hora útil" },
  { icon: MapPin, label: "Grande São Paulo e região metropolitana" },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1.1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5s-.6-1.5-.9-2c-.2-.5-.5-.5-.6-.5H8.7c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4 0-.1-.2-.2-.4-.3zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.9-1.5C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3 .9.9-2.9-.2-.3C3.8 15 3.2 13.5 3.2 12 3.2 7.1 7.1 3.2 12 3.2S20.8 7.1 20.8 12 16.9 20 12 20z" />
    </svg>
  );
}

function FleetSection() {
  const { data: vehicles = [], isPending, isError, isFetching, refetch } = usePublishedVehicles();
  const [modeFilter, setModeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const categories = useMemo(
    () => [...new Set(vehicles.map((vehicle) => vehicle.category))].sort(),
    [vehicles],
  );
  const filteredVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          (modeFilter === "ALL" || vehicle.mode.toLowerCase().includes(modeFilter.toLowerCase())) &&
          (categoryFilter === "ALL" || vehicle.category === categoryFilter),
      ),
    [categoryFilter, modeFilter, vehicles],
  );
  const hasFilters = modeFilter !== "ALL" || categoryFilter !== "ALL";
  const clearFilters = () => {
    setModeFilter("ALL");
    setCategoryFilter("ALL");
  };

  return (
    <section
      id="frota"
      aria-labelledby="catalog-title"
      className="border-b border-border bg-background"
    >
      <div className="container-page py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 id="catalog-title" className="text-3xl font-extrabold text-primary md:text-5xl">
              Encontre seu próximo veículo.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Compare a frota, veja os detalhes e peça uma proposta de locação ou compra direto com
              a equipe.
            </p>
          </div>
          <a
            href={waLink("Olá! Quero ver a disponibilidade atual da frota.")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Consultar disponibilidade <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        {!isPending && !isError && vehicles.length > 0 && (
          <div className="mt-8 flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Modalidade</span>
                <select
                  value={modeFilter}
                  onChange={(event) => setModeFilter(event.target.value)}
                  className="h-10 min-w-40 border border-input bg-background px-3 text-sm"
                >
                  <option value="ALL">Todas</option>
                  <option value="Locação">Locação</option>
                  <option value="Venda">Venda</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium text-foreground">Categoria</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 min-w-48 border border-input bg-background px-3 text-sm"
                >
                  <option value="ALL">Todas</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-4">
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-11 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  Limpar filtros
                </button>
              )}
              <p className="text-sm text-muted-foreground" role="status">
                {filteredVehicles.length} {filteredVehicles.length === 1 ? "veículo" : "veículos"}
              </p>
            </div>
          </div>
        )}

        {isPending ? (
          <div className="catalog-state" role="status" aria-busy="true">
            <RefreshCw className="catalog-loading h-6 w-6 text-primary" aria-hidden="true" />
            <p className="font-semibold">Carregando o catálogo…</p>
            <p className="text-sm text-muted-foreground">
              Buscando os veículos disponíveis para consulta.
            </p>
          </div>
        ) : isError ? (
          <div className="catalog-state">
            <div role="alert">
              <h3 className="text-xl font-bold">Não conseguimos carregar o catálogo.</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tente novamente ou consulte a disponibilidade com nossa equipe.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="button-primary"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {isFetching ? "Carregando…" : "Tentar novamente"}
              </button>
              <a
                className="button-outline"
                href={waLink(
                  "Olá! Não consegui acessar o catálogo. Pode me ajudar a consultar os veículos disponíveis?",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar pelo WhatsApp
              </a>
            </div>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="catalog-state">
            <BusFront className="h-7 w-7 text-primary" aria-hidden="true" />
            <h3 className="text-xl font-bold">
              {hasFilters
                ? "Nenhum veículo com esses filtros."
                : "Consulte as próximas disponibilidades."}
            </h3>
            <p className="max-w-lg text-sm text-muted-foreground">
              {hasFilters
                ? "Experimente outra combinação ou veja todos os veículos do catálogo."
                : "Ainda não há veículos publicados no catálogo. Fale com a equipe sobre o que você precisa."}
            </p>
            {hasFilters ? (
              <button type="button" className="button-primary" onClick={clearFilters}>
                Limpar filtros
              </button>
            ) : (
              <a
                className="button-primary"
                href={waLink(
                  "Olá! Quero consultar a disponibilidade de veículos para locação ou compra.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar disponibilidade <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((v) => (
              <article
                key={v.id}
                className="flex flex-col overflow-hidden border border-border bg-card"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {v.image ? (
                    <img
                      src={v.image}
                      alt={v.alt}
                      loading="lazy"
                      width={1200}
                      height={900}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        event.currentTarget.nextElementSibling?.removeAttribute("hidden");
                      }}
                    />
                  ) : null}
                  <div
                    hidden={Boolean(v.image)}
                    className="h-full place-content-center text-center text-sm text-muted-foreground"
                  >
                    <BusFront className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />
                    Foto em breve
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{v.category}</p>
                      <h3 className="mt-1 text-lg font-bold text-foreground">{v.name}</h3>
                    </div>
                    <span className="shrink-0 border border-border px-2 py-1 text-right text-xs font-semibold text-foreground">
                      {v.status}
                    </span>
                  </div>
                  {v.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {v.description}
                    </p>
                  )}
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-4 text-sm">
                    <div>
                      <dt className="sr-only">Capacidade</dt>
                      <dd className="flex items-center gap-2 text-foreground/85">
                        <Users className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        {v.capacity}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Climatização</dt>
                      <dd className="flex items-center gap-2 text-foreground/85">
                        <Snowflake className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        {v.airConditioned ? "Ar-condicionado" : "Sem ar-condicionado"}
                      </dd>
                    </div>
                  </dl>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {v.equipment.map((e) => (
                      <li key={e} className="flex items-start gap-2">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Modalidade</p>
                      <p className="mt-1 font-semibold text-foreground">{v.mode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Valor</p>
                      <p className="mt-1 font-semibold text-primary">{v.price ?? "Sob consulta"}</p>
                    </div>
                  </div>
                  {(v.year || v.location) && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {[v.year ? `Ano ${v.year}` : null, v.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <a
                      href={waLink(`Olá! Tenho interesse no veículo: ${v.name} (${v.mode}).`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button-whatsapp flex-1"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      Tenho interesse
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const PERSONALIZATION_DRAFT_KEY = "01transportes:personalization:v1";
const emptyDraft = { use: "", passengers: "", needs: "" };
const vehicleUses = [
  "Transporte escolar",
  "Transporte de equipe",
  "Eventos e fretamento",
  "Outra necessidade",
];

function PersonalizationSection() {
  const [draft, setDraft] = useState(emptyDraft);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const { use, passengers, needs } = draft;
  const hasDraft = Boolean(use || passengers || needs);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(
        sessionStorage.getItem(PERSONALIZATION_DRAFT_KEY) ?? "null",
      );
      if (stored && typeof stored === "object") {
        const value = stored as Record<string, unknown>;
        setDraft({
          use: typeof value.use === "string" && vehicleUses.includes(value.use) ? value.use : "",
          passengers:
            typeof value.passengers === "string" && /^\d{1,6}$/.test(value.passengers)
              ? value.passengers
              : "",
          needs: typeof value.needs === "string" ? value.needs.slice(0, 1500) : "",
        });
      }
    } catch {
      // Private browsing and invalid stored drafts must not prevent a new request.
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      if (hasDraft) sessionStorage.setItem(PERSONALIZATION_DRAFT_KEY, JSON.stringify(draft));
      else sessionStorage.removeItem(PERSONALIZATION_DRAFT_KEY);
      setDraftSaved(hasDraft);
    } catch {
      setDraftSaved(false);
    }
  }, [draft, draftReady, hasDraft]);

  function updateDraft(field: keyof typeof emptyDraft, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setNotice("");
  }
  const message = [
    "Olá! Quero um veículo montado de acordo com a minha necessidade.",
    use ? `Uso previsto: ${use}.` : null,
    passengers ? `Número de passageiros: ${passengers}.` : null,
    needs.trim() ? `O que preciso: ${needs.trim()}` : null,
    "Podemos conversar sobre as possibilidades de configuração?",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section
      id="personalizacao"
      className="section-navy border-b border-border"
      aria-labelledby="custom-title"
    >
      <div className="container-page customization-layout">
        <div>
          <h2 id="custom-title" className="customization-title font-extrabold">
            Seu veículo, montado para a sua necessidade.
          </h2>
          <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
            O veículo pode ser montado de acordo com o que você precisa. Conte como será usado, quem
            vai a bordo e quais adaptações deseja consultar.
          </p>
        </div>
        <form
          action={waLink("")}
          method="get"
          target="_blank"
          rel="noopener noreferrer"
          className="customization-form self-start"
        >
          <input type="hidden" name="text" value={message} />
          <h3 className="text-xl font-bold">Conte o que você precisa.</h3>
          <p id="custom-help" className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Preencha o que já souber. Você poderá revisar a mensagem no WhatsApp antes de enviá-la.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Uso do veículo
              <select
                value={use}
                onChange={(event) => updateDraft("use", event.target.value)}
                className="custom-input"
              >
                <option value="">Quero orientação</option>
                {vehicleUses.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Número de passageiros
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                placeholder="Ex.: 20"
                value={passengers}
                onChange={(event) => updateDraft("passengers", event.target.value)}
                className="custom-input"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Necessidades e preferências
              <textarea
                rows={4}
                maxLength={1500}
                placeholder="Conte sobre a sua operação e o que gostaria de consultar."
                value={needs}
                onChange={(event) => updateDraft("needs", event.target.value)}
                className="custom-input"
              />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
            <p role="status">
              {notice ||
                (draftSaved ? "Rascunho salvo nesta aba." : "Todos os campos são opcionais.")}
            </p>
            <button
              type="button"
              disabled={!hasDraft}
              onClick={() => {
                setDraft(emptyDraft);
                setNotice("Respostas limpas.");
              }}
              className="min-h-11 font-semibold underline underline-offset-4 disabled:cursor-default disabled:opacity-50"
            >
              Limpar respostas
            </button>
          </div>
          <p id="custom-viability" className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Nossa equipe confirma as possibilidades, a viabilidade e os valores para cada veículo.
          </p>
          <button
            type="submit"
            aria-describedby="custom-help custom-viability"
            className="button-whatsapp mt-5 w-full"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0" /> Conversar sobre meu veículo
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            Sem envio automático. A conversa continua com nossa equipe.
          </p>
          <details className="mt-4 border-t border-border pt-2">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium underline underline-offset-4">
              Ver mensagem preparada
            </summary>
            <p className="pb-2 text-sm leading-relaxed whitespace-pre-line break-words text-muted-foreground">
              {message}
            </p>
          </details>
        </form>
      </div>
    </section>
  );
}

function Home() {
  const contactMsg =
    "Olá! Quero uma proposta da 01 Transportes. Podemos conversar sobre o tipo de veículo, a rota, os passageiros e o período?";
  return (
    <div className="site-home min-h-screen bg-background text-foreground">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="border-b border-border bg-background">
        <div className="container-page site-header">
          <a href="#top" className="site-brand" aria-label="01 Transportes — início">
            <img
              src={logo}
              alt="01 Transportes"
              width={899}
              height={126}
              className="h-auto w-full"
            />
          </a>
          <nav aria-label="Navegação principal" className="site-nav">
            <a href="#frota">Catálogo</a>
            <a href="#personalizacao">Sob medida</a>
            <a href="#servicos">Serviços</a>
            <a href="#contato">Contato</a>
          </nav>
          <a
            href={waLink(contactMsg)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Falar no WhatsApp"
            className="button-whatsapp header-contact"
          >
            <WhatsAppIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Falar no WhatsApp</span>
          </a>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1}>
        <section id="top" className="section-navy" aria-labelledby="hero-title">
          <div className="container-page hero-layout">
            <div>
              <h1 id="hero-title" className="hero-title font-extrabold">
                O veículo certo para a sua próxima rota.
              </h1>
              <p className="mt-5 max-w-lg text-lg font-semibold leading-snug md:text-xl">
                Transportando pessoas, conectando destinos.
              </p>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                Locação e venda de vans, micro-ônibus e ônibus. Escolha no catálogo ou converse com
                a gente sobre uma montagem de acordo com a sua necessidade.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#frota" className="button-primary">
                  Explorar catálogo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href="#personalizacao" className="button-outline">
                  Quero um veículo sob medida
                </a>
              </div>
              <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
                Frota revisada e documentação em dia.
              </p>
            </div>
            <figure className="hero-vehicle overflow-hidden">
              <img
                src={van}
                alt="Van branca de passageiros, imagem ilustrativa"
                width={1200}
                height={900}
                fetchPriority="high"
                className="hero-image w-full object-cover"
              />
              <figcaption className="flex flex-wrap justify-between gap-2 border-t border-border py-3 text-xs text-muted-foreground">
                <span>Vans, micro-ônibus e ônibus</span>
                <span>Imagem ilustrativa</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <FleetSection />

        <section
          className="section-black border-b border-border"
          aria-label="Cuidados com a operação"
        >
          <div className="container-page grid grid-cols-2 gap-6 py-7 md:grid-cols-4">
            {trust.map((t) => (
              <div key={t.label} className="flex items-start gap-3">
                <t.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium leading-relaxed text-foreground/85">
                  {t.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <PersonalizationSection />

        <section
          id="servicos"
          className="border-b border-border bg-background"
          aria-labelledby="services-title"
        >
          <div className="container-page grid gap-8 py-14 md:py-20 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <h2
                id="services-title"
                className="text-3xl font-extrabold leading-tight text-primary md:text-4xl"
              >
                Uma frota para diferentes rotinas.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Da rota diária da escola ao transporte de uma equipe, encontre a modalidade que faz
                sentido para a sua operação.
              </p>
            </div>
            <div className="divide-y divide-border border-y border-border lg:col-span-7">
              {services.map((s) => (
                <div key={s.title} className="flex gap-5 py-6">
                  <s.icon className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="manutencao"
          className="section-black border-b border-border"
          aria-labelledby="maintenance-title"
        >
          <div className="container-page grid items-center gap-10 py-14 md:py-20 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2
                id="maintenance-title"
                className="text-3xl font-extrabold leading-tight md:text-4xl"
              >
                A manutenção faz parte do serviço.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Cuidamos da frota antes de ela chegar à sua rota. As revisões, vistorias e
                documentos são acompanhados pela equipe interna e podem ser consultados antes da
                locação ou compra.
              </p>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  "Manutenção preventiva mensal",
                  "Vistoria DETRAN atualizada",
                  "Motoristas com curso de transporte escolar",
                  "Cintos e itens de segurança revisados",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href={waLink(
                  "Olá! Quero consultar o histórico de manutenção e a documentação de um veículo.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
              >
                Consultar histórico de manutenção{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <figure>
              <img
                src={maintenance}
                alt="Ilustração de inspeção do motor de um ônibus em oficina"
                loading="lazy"
                width={1200}
                height={900}
                className="aspect-[4/3] w-full object-cover"
              />
              <figcaption className="mt-3 text-xs text-muted-foreground">
                Imagem ilustrativa. Solicite os registros do veículo de seu interesse.
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="contato" className="section-navy" aria-labelledby="contact-title">
          <div className="container-page grid gap-10 py-14 md:py-20 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2
                id="contact-title"
                className="max-w-xl text-4xl font-extrabold leading-tight md:text-5xl"
              >
                Vamos conversar sobre a sua rota?
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                Envie o tipo de veículo, a rota, o número de passageiros e o período. Nossa equipe
                retorna com disponibilidade, documentação e valores.
              </p>
              <a
                href={waLink(contactMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="button-whatsapp mt-7"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Pedir uma proposta
              </a>
              <p className="mt-4 text-sm text-muted-foreground">WhatsApp: {WHATSAPP_LABEL}</p>
              <a
                href={`tel:+${WHATSAPP_NUMBER}`}
                className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> Prefere ligar? {WHATSAPP_LABEL}
              </a>
            </div>
            <div className="border-t border-border pt-6 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <h3 className="text-lg font-bold">Atendimento</h3>
              <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
                <div className="py-4">
                  <dt className="text-muted-foreground">Região atendida</dt>
                  <dd className="mt-2 flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Grande São Paulo e região metropolitana
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-muted-foreground">Horário</dt>
                  <dd className="mt-2 flex items-start gap-2">
                    <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Segunda a sábado, 7h às 19h
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-muted-foreground">Documentação</dt>
                  <dd className="mt-2 flex items-start gap-2">
                    <FileCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Notas fiscais e contratos formais
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="section-black border-t border-border">
        <div className="container-page flex flex-col gap-5 py-8 lg:flex-row lg:items-center lg:justify-between">
          <img
            src={logo}
            alt="01 Transportes"
            width={899}
            height={126}
            className="h-auto w-52 invert mix-blend-screen"
          />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 01 Transportes. Locação e venda de veículos.
          </p>
          <nav
            aria-label="Navegação do rodapé"
            className="flex flex-wrap items-center gap-x-5 text-xs text-muted-foreground"
          >
            <a href="#frota" className="inline-flex min-h-11 items-center hover:text-foreground">
              Catálogo
            </a>
            <a
              href="#manutencao"
              className="inline-flex min-h-11 items-center hover:text-foreground"
            >
              Manutenção
            </a>
            <Link
              to="/admin"
              className="inline-flex min-h-11 items-center gap-2 hover:text-foreground"
            >
              <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
              Admin
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
