"use client"

import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"

interface Props {
  text: string
}

export default function ShinyText({ text }: Props) {
  return <AnimatedShinyText className="text-sm font-medium text-foreground/90">{text}</AnimatedShinyText>
}
