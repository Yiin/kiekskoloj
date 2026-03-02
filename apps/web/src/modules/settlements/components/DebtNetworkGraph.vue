<template>
  <div class="w-full max-w-sm mx-auto">
    <svg
      v-if="debts.length > 0"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      class="w-full h-auto"
    >
      <defs>
        <marker
          v-for="(d, i) in debts"
          :id="`arrow-${i}`"
          :key="`marker-${i}`"
          markerWidth="6"
          markerHeight="5"
          refX="5"
          refY="2.5"
          orient="auto"
        >
          <polygon
            points="0,0 6,2.5 0,5"
            :fill="arcColor"
          />
        </marker>
      </defs>

      <!-- Arcs -->
      <path
        v-for="(arc, i) in arcs"
        :key="`arc-${i}`"
        :d="arc.path"
        fill="none"
        :stroke="arcColor"
        :stroke-width="arc.thickness"
        stroke-linecap="round"
        :marker-end="`url(#arrow-${i})`"
      />

      <!-- Arc labels -->
      <g v-for="(arc, i) in arcs" :key="`label-${i}`">
        <rect
          :x="arc.label.x - arc.label.width / 2 - 4"
          :y="arc.label.y - 6"
          :width="arc.label.width + 8"
          height="13"
          rx="3"
          class="fill-card stroke-border"
          stroke-width="0.5"
        />
        <text
          :x="arc.label.x"
          :y="arc.label.y + 4"
          text-anchor="middle"
          class="fill-foreground"
          :style="{ fontSize: '8px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 600 }"
        >
          {{ arc.label.text }}
        </text>
      </g>

      <!-- Nodes -->
      <g v-for="node in nodes" :key="node.id">
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="nodeRadius"
          :fill="node.fill"
          :stroke="node.stroke"
          stroke-width="2"
        />
        <text
          :x="node.x"
          :y="node.y + 1"
          text-anchor="middle"
          dominant-baseline="central"
          fill="white"
          :style="{ fontSize: `${initialFontSize}px`, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 700 }"
        >
          {{ node.initial }}
        </text>

        <!-- Name + balance below/above node -->
        <text
          :x="node.x"
          :y="node.labelY"
          text-anchor="middle"
          class="fill-foreground"
          :style="{ fontSize: '9px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 600 }"
        >
          {{ node.name }}
        </text>
        <text
          :x="node.x"
          :y="node.balanceLabelY"
          text-anchor="middle"
          :fill="node.balanceColor"
          :style="{ fontSize: '8px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 500 }"
        >
          {{ node.balanceText }}
        </text>
      </g>
    </svg>

    <!-- Empty state -->
    <div v-else class="flex flex-col items-center gap-2 py-8 text-muted-foreground">
      <svg class="w-10 h-10 text-positive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="text-sm font-medium">All settled up!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { formatCurrency } from "@kiekskoloj/shared"
import type { Balance, SimplifiedDebt } from "@/stores/settlements"

const props = defineProps<{
  balances: Balance[]
  debts: SimplifiedDebt[]
  currency: string
}>()

const SIZE = 400
const CENTER = SIZE / 2

const arcColor = "var(--color-primary)"

const memberCount = computed(() => props.balances.length)

const ringRadius = computed(() => {
  const n = memberCount.value
  if (n <= 2) return 80
  if (n <= 3) return 100
  if (n <= 4) return 120
  return 140
})

const nodeRadius = computed(() => {
  const n = memberCount.value
  if (n <= 3) return 24
  if (n <= 5) return 20
  return 16
})

const initialFontSize = computed(() => {
  return nodeRadius.value >= 20 ? 12 : 10
})

interface NodeInfo {
  id: string
  name: string
  initial: string
  x: number
  y: number
  labelY: number
  balanceLabelY: number
  fill: string
  stroke: string
  balanceColor: string
  balanceText: string
  angle: number
}

const balanceMap = computed(() => {
  const map = new Map<string, Balance>()
  for (const b of props.balances) {
    map.set(b.memberId, b)
  }
  return map
})

const nodes = computed<NodeInfo[]>(() => {
  const n = memberCount.value
  if (n === 0) return []

  const R = ringRadius.value
  const nr = nodeRadius.value

  return props.balances.map((b, i) => {
    let angle: number
    if (n === 2) {
      // Horizontal placement for 2 members
      angle = i === 0 ? Math.PI : 0
    } else {
      angle = -Math.PI / 2 + (2 * Math.PI * i) / n
    }

    const x = CENTER + R * Math.cos(angle)
    const y = CENTER + R * Math.sin(angle)

    // Label placement: outside the ring
    const isBottom = y > CENTER + 10
    const labelOffset = nr + 14
    const labelY = isBottom ? y + labelOffset : y - labelOffset
    const balanceLabelY = isBottom ? labelY + 11 : labelY + 11

    let fill: string
    let stroke: string
    let balanceColor: string
    if (b.balance > 0.01) {
      fill = "var(--color-positive)"
      stroke = "var(--color-positive)"
      balanceColor = "var(--color-positive)"
    } else if (b.balance < -0.01) {
      fill = "var(--color-destructive)"
      stroke = "var(--color-destructive)"
      balanceColor = "var(--color-destructive)"
    } else {
      fill = "var(--color-muted-foreground)"
      stroke = "var(--color-muted-foreground)"
      balanceColor = "var(--color-muted-foreground)"
    }

    const abs = Math.abs(b.balance)
    const formatted = formatCurrency(abs, props.currency)
    let balanceText: string
    if (b.balance > 0.01) balanceText = `+${formatted}`
    else if (b.balance < -0.01) balanceText = `-${formatted}`
    else balanceText = formatted

    return {
      id: b.memberId,
      name: b.memberName,
      initial: getInitials(b.memberName),
      x,
      y,
      labelY,
      balanceLabelY,
      fill,
      stroke,
      balanceColor,
      balanceText,
      angle,
    }
  })
})

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

interface ArcInfo {
  path: string
  thickness: number
  label: {
    x: number
    y: number
    text: string
    width: number
  }
}

const nodeMap = computed(() => {
  const map = new Map<string, NodeInfo>()
  for (const n of nodes.value) {
    map.set(n.id, n)
  }
  return map
})

const arcs = computed<ArcInfo[]>(() => {
  if (props.debts.length === 0) return []

  const maxAmount = Math.max(...props.debts.map((d) => d.amount))
  const minThick = 1.5
  const maxThick = 5

  return props.debts.map((debt) => {
    const fromNode = nodeMap.value.get(debt.from)
    const toNode = nodeMap.value.get(debt.to)
    if (!fromNode || !toNode) return null

    // Normalized thickness
    const t = maxAmount > 0 ? debt.amount / maxAmount : 0.5
    const thickness = minThick + t * (maxThick - minThick)

    // Direction from -> to along node edge
    const dx = toNode.x - fromNode.x
    const dy = toNode.y - fromNode.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 0.01) return null

    const ux = dx / dist
    const uy = dy / dist
    const nr = nodeRadius.value

    // Start and end on circle edges
    const sx = fromNode.x + ux * (nr + 2)
    const sy = fromNode.y + uy * (nr + 2)
    const ex = toNode.x - ux * (nr + 8) // extra offset for arrowhead
    const ey = toNode.y - uy * (nr + 8)

    // Control point: midpoint pushed away from center
    const mx = (fromNode.x + toNode.x) / 2
    const my = (fromNode.y + toNode.y) / 2
    const toCenterDx = mx - CENTER
    const toCenterDy = my - CENTER
    const toCenterDist = Math.sqrt(toCenterDx * toCenterDx + toCenterDy * toCenterDy)

    let cpx: number
    let cpy: number
    if (toCenterDist < 1) {
      // Midpoint is at center — push perpendicular
      cpx = mx + (-uy) * 50
      cpy = my + ux * 50
    } else {
      const pushDist = Math.max(30, dist * 0.25)
      cpx = mx + (toCenterDx / toCenterDist) * pushDist
      cpy = my + (toCenterDy / toCenterDist) * pushDist
    }

    const path = `M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`

    // Label at bezier midpoint (t=0.5)
    const lx = 0.25 * sx + 0.5 * cpx + 0.25 * ex
    const ly = 0.25 * sy + 0.5 * cpy + 0.25 * ey

    const labelText = formatCurrency(debt.amount, props.currency)
    const labelWidth = labelText.length * 5.2

    return {
      path,
      thickness,
      label: {
        x: lx,
        y: ly,
        text: labelText,
        width: labelWidth,
      },
    }
  }).filter((a): a is ArcInfo => a !== null)
})
</script>
