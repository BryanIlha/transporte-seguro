import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileCheck,
  MapPin,
  Phone,
  ShieldCheck,
  Snowflake,
  Users,
  Wrench,
} from "lucide-react";
import logo from "@/assets/01transportes-logo.svg";
import heroBus from "@/assets/hero-bus.jpg";
import vehicleVan from "@/assets/vehicle-van.jpg";
import vehicleMicrobus from "@/assets/vehicle-microbus.jpg";
import vehicleBus from "@/assets/vehicle-bus.jpg";
import maintenance from "@/assets/maintenance.jpg";

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

const WA_NUMBER = "5511999999999";
const waLink = (msg: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

type Vehicle = {
  name: string;
  category: string;
  capacity: string;
  equipment: string[];
  status: "Disponível" | "Sob consulta";
  mode: "Locação" | "Venda" | "Locação e venda";
  image: string;
  alt: string;
};

const vehicles: Vehicle[] = [
  {
    name: "Micro-ônibus escolar",
    category: "Transporte escolar",
    capacity: "24 passageiros",
    equipment: ["Cintos individuais", "Ar-condicionado", "Documentação escolar"],
    status: "Disponível",
    mode: "Locação",
    image: vehicleMicrobus,
    alt: "Micro-ônibus escolar amarelo estacionado em rua urbana",
  },
  {
    name: "Van executiva",
    category: "Fretamento",
    capacity: "15 passageiros",
    equipment: ["Ar-condicionado", "Bancos reclináveis", "Porta-malas amplo"],
    status: "Disponível",
    mode: "Locação e venda",
    image: vehicleVan,
    alt: "Van branca estacionada em pátio de empresa de transporte",
  },
  {
    name: "Ônibus escolar",
    category: "Transporte escolar",
    capacity: "42 passageiros",
    equipment: ["Revisão em dia", "Vistoria DETRAN", "Motorista habilitado"],
    status: "Sob consulta",
    mode: "Venda",
    image: vehicleBus,
    alt: "Ônibus escolar amarelo estacionado em terminal",
  },
];

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
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1.1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5s-.6-1.5-.9-2c-.2-.5-.5-.5-.6-.5H8.7c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1 2.9 1.2 3.1c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4 0-.1-.2-.2-.4-.3zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.3L2 22l4.9-1.5C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18c-1.7 0-3.3-.5-4.7-1.3l-.3-.2-3 .9.9-2.9-.2-.3C3.8 15 3.2 13.5 3.2 12 3.2 7.1 7.1 3.2 12 3.2S20.8 7.1 20.8 12 16.9 20 12 20z" />
    </svg>
  );
}

function Home() {
  const heroMsg =
    "Olá! Quero solicitar atendimento da 01 Transportes.";
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
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/80">
            <a href="#servicos" className="hover:text-foreground">Serviços</a>
            <a href="#frota" className="hover:text-foreground">Frota</a>
            <a href="#manutencao" className="hover:text-foreground">Manutenção</a>
            <a href="#contato" className="hover:text-foreground">Contato</a>
          </nav>
          <a
            href={waLink(heroMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-whatsapp px-4 py-2 text-sm font-semibold text-whatsapp-foreground transition-colors hover:brightness-95"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Falar no WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="border-b border-border bg-background">
        <div className="container-page grid gap-10 py-14 md:py-20 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <span className="eyebrow">Transporte escolar e comercial</span>
            <h1 className="mt-4 text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] text-primary">
              Transporte escolar para todos os caminhos.
            </h1>
            <p className="mt-5 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
              Locação e venda de veículos com frota revisada, documentação em
              dia e atendimento direto com quem opera. Sem intermediários, sem
              promessas exageradas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={waLink(heroMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-whatsapp px-5 py-3 text-sm font-semibold text-whatsapp-foreground transition-colors hover:brightness-95"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Solicitar atendimento
              </a>
              <a
                href="#frota"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Ver a frota
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Frota</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">40+</dd>
                <p className="text-xs text-muted-foreground">veículos ativos</p>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Operação</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">12 anos</dd>
                <p className="text-xs text-muted-foreground">de atividade</p>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Retorno</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">1h</dd>
                <p className="text-xs text-muted-foreground">média comercial</p>
              </div>
            </dl>
          </div>
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-md border border-border bg-surface">
              <img
                src={heroBus}
                alt="Micro-ônibus escolar amarelo estacionado em entrada de escola"
                width={1600}
                height={1100}
                className="h-full w-full object-cover"
              />
              <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-sm bg-highlight px-3 py-1.5 text-xs font-semibold text-highlight-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-highlight-foreground" />
                Frota vistoriada 2026
              </div>
            </div>
          </div>
        </div>
      </section>

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
              <span className="eyebrow">O que fazemos</span>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-primary">
                Locação e venda de veículos.
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Atendemos escolas, empresas, instituições e clientes
                particulares com uma operação organizada e comunicação direta.
              </p>
            </div>
            <div className="lg:col-span-8 grid gap-4 sm:grid-cols-3">
              {services.map((s) => (
                <div
                  key={s.title}
                  className="rounded-md border border-border bg-card p-6"
                >
                  <s.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-bold text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section id="frota" className="border-b border-border bg-surface">
        <div className="container-page py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">Catálogo</span>
              <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-primary">
                Nossa frota.
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Veículos disponíveis para locação e venda. Consulte
                disponibilidade e documentação de cada unidade.
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

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <article
                key={v.name}
                className="group flex flex-col overflow-hidden rounded-md border border-border bg-card shadow-sm/0 transition-shadow hover:shadow-sm"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={v.image}
                    alt={v.alt}
                    loading="lazy"
                    width={1200}
                    height={900}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <span className="absolute right-3 top-3 rounded-sm bg-primary px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                    {v.mode}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {v.category}
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-foreground">
                    {v.name}
                  </h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="text-foreground/85">{v.capacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Snowflake className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="text-foreground/85">Ar-condicionado</span>
                    </div>
                  </dl>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {v.equipment.map((e) => (
                      <li key={e} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        v.status === "Disponível"
                          ? "text-[oklch(0.5_0.14_148)]"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          v.status === "Disponível"
                            ? "bg-[oklch(0.55_0.15_148)]"
                            : "bg-muted-foreground"
                        }`}
                      />
                      {v.status}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <a
                      href={waLink(
                        `Olá! Tenho interesse no veículo: ${v.name} (${v.mode}).`,
                      )}
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
        </div>
      </section>

      {/* Maintenance */}
      <section id="manutencao" className="border-b border-border">
        <div className="container-page grid items-center gap-10 py-16 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <span className="eyebrow">Segurança e manutenção</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-primary">
              Frota revisada, documentação em dia.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Todos os veículos passam por manutenção preventiva em oficina
              própria. Vistorias, laudos e documentação são acompanhados por
              equipe interna, com histórico disponível a cada locação ou venda.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Manutenção preventiva mensal",
                "Vistoria DETRAN atualizada",
                "Motoristas com curso de transporte escolar",
                "Cintos e itens de segurança revisados",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-foreground/85">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 inline-flex items-center gap-3 rounded-md border-l-4 border-highlight bg-surface px-4 py-3">
              <span className="text-sm font-medium text-foreground/85">
                Solicite o histórico de manutenção do veículo antes de fechar.
              </span>
            </div>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="overflow-hidden rounded-md border border-border">
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
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
              Solicite atendimento
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-extrabold leading-tight">
              Fale com quem opera a frota.
            </h2>
            <p className="mt-4 max-w-xl text-primary-foreground/80 leading-relaxed">
              Envie sua demanda pelo WhatsApp com a rota, o número de
              passageiros e o período. Retornamos com disponibilidade,
              documentação e valores.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={waLink(heroMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-whatsapp px-5 py-3 text-sm font-semibold text-whatsapp-foreground transition-colors hover:brightness-95"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Falar no WhatsApp
              </a>
              <a
                href="tel:+5511999999999"
                className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/25 bg-transparent px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
              >
                <Phone className="h-4 w-4" />
                (11) 99999-9999
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-md border border-primary-foreground/15 bg-primary-foreground/[0.04] p-6">
              <h3 className="text-base font-bold">Área de atendimento</h3>
              <ul className="mt-4 space-y-3 text-sm text-primary-foreground/85">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
                  <span>Grande São Paulo e região metropolitana</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
                  <span>Segunda a sábado, 7h às 19h</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
                  <span>Notas fiscais e contratos formais</span>
                </li>
              </ul>
            </div>
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
            <a href="#servicos" className="hover:text-foreground">Serviços</a>
            <a href="#frota" className="hover:text-foreground">Frota</a>
            <a href="#contato" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={waLink(heroMsg)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lg transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="h-7 w-7" />
      </a>
    </div>
  );
}
