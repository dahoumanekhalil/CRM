"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoProps } from "@/lib/landing-blocks/types";

function getEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null;

  // YouTube: watch?v=, youtu.be/, /embed/
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`;

  // Vimeo: vimeo.com/ID
  const vim = url.match(/vimeo\.com\/(\d+)/);
  if (vim) return `https://player.vimeo.com/video/${vim[1]}?color=ffffff&title=0&byline=0&portrait=0`;

  // Already an embed
  if (url.includes("/embed/") || url.includes("player.vimeo.com")) return url;

  return null;
}

const ASPECT: Record<string, string> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
};

export function VideoBlock({ props }: { props: VideoProps }) {
  const embedUrl = getEmbedUrl(props.url);
  const aspectClass = ASPECT[props.aspectRatio ?? "16/9"];

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-5xl px-6">
        {(props.heading || props.subheading) && (
          <div className="mb-10 text-center">
            {props.heading && (
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{props.heading}</h2>
            )}
            {props.subheading && (
              <p className="mt-3 text-muted-foreground">{props.subheading}</p>
            )}
          </div>
        )}

        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-xl",
            aspectClass
          )}
        >
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={props.heading ?? "Video"}
              allow="autoplay; fullscreen; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <div className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30">
                <Play className="size-7 translate-x-0.5" />
              </div>
              <p className="text-sm">Paste a YouTube or Vimeo URL in the inspector</p>
            </div>
          )}
        </div>

        {props.caption && (
          <p className="mt-4 text-center text-sm text-muted-foreground">{props.caption}</p>
        )}
      </div>
    </section>
  );
}
