"use client"

import Carousel3D from "@/components/carousel-3d"
import ShinyText from "@/components/shiny-text"

export default function TestPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">Test Page</h1>
        <p className="text-muted-foreground mb-8">This is a test page with Carousel3D and ShinyText components.</p>
        <div className="mb-12">
          <ShinyText text="Shiny Text Example" />
        </div>
        <Carousel3D />
      </div>
    </div>
  )
}
