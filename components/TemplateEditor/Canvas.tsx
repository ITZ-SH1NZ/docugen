'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import * as pdfjs from 'pdfjs-dist';
import type { TemplateField } from '@/lib/types';

// Served locally from /public (copied on install/build) — no CDN round-trip.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const DISPLAY_W = 760; // on-screen page width in px
const MIN = 12; // min field size in points

interface Props {
  pdfUrl: string;
  fields: TemplateField[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  // Patch is in PDF points (top-left origin).
  onChange: (id: string, patch: Partial<TemplateField>) => void;
}

export default function Canvas({ pdfUrl, fields, selectedId, onSelect, onChange }: Props) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number; scale: number } | null>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const layerRef = useRef<Konva.Layer>(null);

  // Render the first PDF page to an <img> for the Konva background.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const doc = await pdfjs.getDocument(pdfUrl).promise;
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const scale = DISPLAY_W / base.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => {
        if (cancelled) return;
        setImage(img);
        setDims({ w: viewport.width, h: viewport.height, scale });
      };
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  // Attach the transformer to the selected rect.
  useEffect(() => {
    const tr = trRef.current;
    const layer = layerRef.current;
    if (!tr || !layer) return;
    if (!selectedId) {
      tr.nodes([]);
      layer.batchDraw();
      return;
    }
    const node = layer.findOne(`#${selectedId}`);
    tr.nodes(node ? [node] : []);
    layer.batchDraw();
  }, [selectedId, fields, image]);

  if (!dims || !image) {
    return <div className="muted">Rendering template…</div>;
  }
  const { scale } = dims;

  const clamp = (f: { x: number; y: number; width: number; height: number }) => {
    const width = Math.max(MIN, Math.min(f.width, dims.w / scale));
    const height = Math.max(MIN, Math.min(f.height, dims.h / scale));
    const x = Math.max(0, Math.min(f.x, dims.w / scale - width));
    const y = Math.max(0, Math.min(f.y, dims.h / scale - height));
    return { x, y, width, height };
  };

  return (
    <div className="konva-frame">
      <Stage
        width={dims.w}
        height={dims.h}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
      >
        <Layer ref={layerRef} listening>
          <KonvaImage image={image} x={0} y={0} width={dims.w} height={dims.h} listening={false} />

          {fields.map((f) => (
            <Rect
              key={f.id}
              id={f.id}
              x={f.x * scale}
              y={f.y * scale}
              width={f.width * scale}
              height={f.height * scale}
              fill="rgba(59,130,246,0.14)"
              stroke={f.id === selectedId ? '#3b82f6' : '#9aa3b2'}
              strokeWidth={f.id === selectedId ? 2 : 1}
              draggable
              onClick={() => onSelect(f.id)}
              onTap={() => onSelect(f.id)}
              onDragEnd={(e) => {
                const node = e.target;
                onChange(
                  f.id,
                  clamp({
                    x: node.x() / scale,
                    y: node.y() / scale,
                    width: f.width,
                    height: f.height,
                  }),
                );
              }}
              onTransformEnd={(e) => {
                const node = e.target as Konva.Rect;
                const sx = node.scaleX();
                const sy = node.scaleY();
                node.scaleX(1);
                node.scaleY(1);
                onChange(
                  f.id,
                  clamp({
                    x: node.x() / scale,
                    y: node.y() / scale,
                    width: (node.width() * sx) / scale,
                    height: (node.height() * sy) / scale,
                  }),
                );
              }}
            />
          ))}

          {fields.map((f) => (
            <Text
              key={`lbl-${f.id}`}
              x={f.x * scale + 3}
              y={f.y * scale - 14}
              text={`${f.field_index}: ${f.label || 'field'}`}
              fontSize={11}
              fill={f.id === selectedId ? '#3b82f6' : '#9aa3b2'}
              listening={false}
            />
          ))}

          <Transformer
            ref={trRef}
            rotateEnabled={false}
            keepRatio={false}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < MIN || newBox.height < MIN ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>
    </div>
  );
}
