import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Snowflake,
  Users,
  Wrench,
} from "lucide-react";
import logo from "@/assets/01transportes-logo.svg";
import maintenance from "@/assets/maintenance.jpg";
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
          "Frota escolar e comercial revisada, documentação em dia e atendimento direto pelo WhatsApp. Locação e venda de veículos em todo o Brasil.",
      },
      { property: "og:title", content: "01 Transportes — Transporte escolar e frota comercial" },
      {
        property: "og:description",
        content: "Locação e venda de veículos com frota revisada e documentação em dia.",
      },
    ],
  }),
});

const WA_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "";
const waLink = (msg: string) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

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
  image: string;
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
    image: primaryImage?.path ?? maintenance,
    alt: primaryImage?.alt_text ?? vehicle.title,
  };
}

function usePublishedVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadVehicles() {
      try {
        const catalogVehicles = await getCatalogVehicles();
        if (!catalogVehicles) return;
        if (!cancelled) setVehicles(catalogVehicles.map(toDisplayVehicle));
      } catch (error) {
        console.error("Não foi possível carregar o catálogo.", error);
        return;
      }
    }

    void loadVehicles();

    return () => {
      cancelled = true;
    };
  }, []);

  return vehicles;
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
  { icon: MapPin, label: "Atendimento em toda a região" },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1.1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5s-.6-1.5-.9-2c-.2-.5-.5-.5-.6-.5H8.7c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4 0-.1-.2-.2-.4-.3zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.9-1.5C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3 .9.9-2.9-.2-.3C3.8 15 3.2 13.5 3.2 12 3.2 7.1 7.1 3.2 12 3.2S20.8 7.1 20.8 12 16.9 20 12 20z" />
    </svg>
  );
}

function FleetSection({ vehicles }: { vehicles: Vehicle[] }) {
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
          (modeFilter === "ALL" || vehicle.mode.includes(modeFilter)) &&
          (categoryFilter === "ALL" || vehicle.category === categoryFilter),
      ),
    [categoryFilter, modeFilter, vehicles],
  );

  return (
    <section id="frota" className="border-b border-border bg-surface">
      <div className="container-page py-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-primary">Catálogo 01 Transportes</p>
            <h2 className="mt-2 text-3xl font-extrabold text-primary md:text-4xl">
              Escolha o veículo para a sua operação.
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
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Consultar disponibilidade →
          </a>
        </div>

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
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filteredVehicles.length} {filteredVehicles.length === 1 ? "veículo" : "veículos"}
          </p>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="border border-dashed border-border bg-card px-5 py-12 text-center">
            <p className="font-semibold text-foreground">Nenhum veículo encontrado.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajuste os filtros ou fale com a equipe para consultar outras opções.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.map((v) => (
              <article
                key={v.id}
                className="flex flex-col overflow-hidden border border-border bg-card"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={v.image}
                    alt={v.alt}
                    loading="lazy"
                    width={1200}
                    height={900}
                    className="h-full w-full object-cover"
                  />
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
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="text-foreground/85">{v.capacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Snowflake className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="text-foreground/85">
                        {v.airConditioned ? "Ar-condicionado" : "Ventilação natural"}
                      </span>
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
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-whatsapp px-3 py-2 text-sm font-semibold text-whatsapp-foreground transition-colors hover:brightness-95"
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

function Home() {
  const contactMsg = "Olá! Quero solicitar atendimento da 01 Transportes.";
  const catalogVehicles = usePublishedVehicles();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container-page flex items-center justify-between py-4">
          <a href="#top" className="flex items-center gap-3" aria-label="01 Transportes">
            <img
              src={logo}
              alt="01 Transportes"
              className="h-8 md:h-9 w-auto"
              width={899}
              height={126}
            />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-foreground/80 lg:flex">
            <a href="#frota" className="hover:text-foreground">
              Catálogo
            </a>
            <a href="#servicos" className="hover:text-foreground">
              Serviços
            </a>
            <a href="#manutencao" className="hover:text-foreground">
              Manutenção
            </a>
            <a href="#contato" className="hover:text-foreground">
              Contato
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Área do administrador</span>
              <span className="sm:hidden">Admin</span>
            </Link>
            <a
              href={waLink(contactMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-whatsapp px-3 py-2 text-sm font-semibold text-whatsapp-foreground transition-colors hover:brightness-95 sm:px-4"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Falar no WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Intro */}
      <section id="top" className="border-b border-border bg-background">
        <div className="container-page grid gap-6 py-8 md:grid-cols-12 md:items-end md:gap-10 md:py-10">
          <div className="md:col-span-7">
            <h1 className="text-3xl font-black leading-tight text-primary md:text-4xl">
              Catálogo de veículos para locação e venda.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Encontre vans, micro-ônibus e ônibus para escolas, empresas e eventos. Veja a frota
              disponível e fale direto com a equipe da 01 Transportes.
            </p>
          </div>
          <div className="md:col-span-5 md:flex md:justify-end">
            <div className="flex flex-wrap gap-3">
              <a
                href={waLink(contactMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-whatsapp px-5 py-3 text-sm font-semibold text-whatsapp-foreground transition-colors hover:brightness-95"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Solicitar atendimento
              </a>
              <a
                href="#frota"
                className="inline-flex items-center gap-2 rounded-md border border-primary px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                Ver catálogo
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <FleetSection vehicles={catalogVehicles} />

      {/* Trust bar */}
      <section className="border-b border-border bg-surface">
        <div className="container-page grid grid-cols-2 gap-6 py-6 md:grid-cols-4">
          {trust.map((t) => (
            <div key={t.label} className="flex items-center gap-3">
              <t.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground/85">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="servicos" className="border-b border-border">
        <div className="container-page py-16 md:py-24">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-3xl md:text-4xl font-extrabold text-primary">
                Uma frota para diferentes rotinas.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Da rota diária da escola ao transporte de uma equipe, montamos a solução com o
                veículo e o período que fazem sentido para a sua operação.
              </p>
            </div>
            <div className="lg:col-span-8 grid gap-4 sm:grid-cols-3">
              {services.map((s) => (
                <div key={s.title} className="border-t-2 border-primary bg-card pt-5">
                  <s.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Maintenance */}
      <section id="manutencao" className="border-b border-border">
        <div className="container-page grid items-center gap-10 py-16 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl font-extrabold text-primary">
              A manutenção faz parte do serviço.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Cuidamos da frota antes de ela chegar à sua rota. As revisões, vistorias e documentos
              são acompanhados pela equipe interna e podem ser consultados antes da locação ou
              compra.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Manutenção preventiva mensal",
                "Vistoria DETRAN atualizada",
                "Motoristas com curso de transporte escolar",
                "Cintos e itens de segurança revisados",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span className="text-foreground/85">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-l-2 border-highlight pl-4 text-sm font-medium text-foreground/85">
              Solicite o histórico de manutenção do veículo antes de fechar.
            </p>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="overflow-hidden border border-border">
              <img
                src={maintenance}
                alt="Mecânico inspecionando o motor de um ônibus escolar em oficina"
                loading="lazy"
                width={1200}
                height={900}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contato" className="bg-primary text-primary-foreground">
        <div className="container-page grid gap-10 py-16 md:py-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
              Fale com quem opera a frota.
            </h2>
            <p className="mt-4 max-w-xl text-primary-foreground/80 leading-relaxed">
              Envie sua demanda pelo WhatsApp com a rota, o número de passageiros e o período.
              Retornamos com disponibilidade, documentação e valores.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={waLink(contactMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-whatsapp px-5 py-3 text-sm font-semibold text-whatsapp-foreground transition-colors hover:brightness-95"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 pt-6 lg:col-span-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <h3 className="text-base font-bold">Atendimento</h3>
            <dl className="mt-4 text-sm text-primary-foreground/85">
              <div className="border-b border-primary-foreground/15 py-3 first:border-t">
                <dt className="text-primary-foreground/60">Onde</dt>
                <dd className="mt-1 flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
                  Grande São Paulo e região metropolitana
                </dd>
              </div>
              <div className="border-b border-primary-foreground/15 py-3">
                <dt className="text-primary-foreground/60">Horário</dt>
                <dd className="mt-1 flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
                  Segunda a sábado, 7h às 19h
                </dd>
              </div>
              <div className="border-b border-primary-foreground/15 py-3">
                <dt className="text-primary-foreground/60">Documentos</dt>
                <dd className="mt-1 flex items-start gap-2">
                  <FileCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-highlight"
                    aria-hidden="true"
                  />
                  Notas fiscais e contratos formais
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="01 Transportes" className="h-7 w-auto" />
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 01 Transportes. Locação e venda de veículos.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="#servicos" className="hover:text-foreground">
              Serviços
            </a>
            <a href="#frota" className="hover:text-foreground">
              Frota
            </a>
            <a href="#contato" className="hover:text-foreground">
              Contato
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
