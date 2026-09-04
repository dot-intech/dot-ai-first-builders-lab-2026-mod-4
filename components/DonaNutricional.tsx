import type { DesgloseNutricional } from "@/lib/consumos/nutricion";

interface DonaNutricionalProps {
  calorias: number;
  desglose: DesgloseNutricional;
}

// Colores tomados de la paleta de Pico (pico.colors.css): pumpkin-300,
// blue-500, red-450, jade-350.
const CATEGORIAS: { clave: keyof DesgloseNutricional; label: string; color: string }[] = [
  { clave: "carbohidratos", label: "Carbohidratos", color: "#ff9500" },
  { clave: "proteinas", label: "Proteínas", color: "#3c71f7" },
  { clave: "grasas", label: "Grasas", color: "#ee402e" },
  { clave: "otrosNutrientes", label: "Otros nutrientes", color: "#00b478" },
];

const RADIO = 70;
const GROSOR = 24;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

export default function DonaNutricional({ calorias, desglose }: DonaNutricionalProps) {
  let acumulado = 0;

  return (
    <figure style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg viewBox="0 0 180 180" width={180} height={180} role="img" aria-label={`Total ${calorias} calorías`}>
        <g transform="rotate(-90 90 90)">
          <circle cx={90} cy={90} r={RADIO} fill="none" stroke="var(--dona-fondo)" strokeWidth={GROSOR} />
          {CATEGORIAS.map(({ clave, color }) => {
            const porcentaje = desglose[clave];
            const largo = (porcentaje / 100) * CIRCUNFERENCIA;
            const offset = -((acumulado / 100) * CIRCUNFERENCIA);
            acumulado += porcentaje;
            if (porcentaje === 0) return null;
            return (
              <circle
                key={clave}
                cx={90}
                cy={90}
                r={RADIO}
                fill="none"
                stroke={color}
                strokeWidth={GROSOR}
                strokeDasharray={`${largo} ${CIRCUNFERENCIA - largo}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </g>
        <text x={90} y={85} textAnchor="middle" fontSize={22} fontWeight={700}>
          {calorias}
        </text>
        <text x={90} y={106} textAnchor="middle" fontSize={12} fill="currentColor" opacity={0.7}>
          kcal
        </text>
      </svg>
      <figcaption>
        <ul style={{ listStyle: "none", display: "flex", flexWrap: "wrap", gap: "8px 16px", padding: 0, margin: 0 }}>
          {CATEGORIAS.map(({ clave, label, color }) => (
            <li key={clave} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
              <span
                aria-hidden
                style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }}
              />
              {label}: {desglose[clave]}%
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
