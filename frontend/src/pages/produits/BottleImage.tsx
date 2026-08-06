import { useState, type CSSProperties } from 'react';

interface BottleImageProps {
  categorie: string;
  productName: string;
  style?: CSSProperties;
  className?: string;
}

const CATEGORY_IMAGES: Record<string, string> = {
  vins: '/images/bottles/vins.png',
  bieres: '/images/bottles/bieres.png',
  whisky: '/images/bottles/whisky.png',
  cocktails: '/images/bottles/cocktails.png',
  jus: '/images/bottles/jus.png',
  sodas: '/images/bottles/sodas.png',
  eau: '/images/bottles/eau.png',
};

const DEFAULT_IMAGE = '/images/bottles/default.png';

function getImagePath(categorie: string): string {
  const key = categorie.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CATEGORY_IMAGES[key] || DEFAULT_IMAGE;
}

export default function BottleImage({ categorie, productName, style, className }: BottleImageProps) {
  const [hasError, setHasError] = useState(false);
  const imagePath = getImagePath(categorie);

  const containerStyle: CSSProperties = {
    width: 60,
    height: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (hasError) {
    return (
      <div style={containerStyle} className={className}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            borderRadius: 8,
            color: '#bfbfbf',
            fontSize: 32,
          }}
          role="img"
          aria-label={productName}
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M9 2v2H5v2h1v13a2 2 0 002 2h8a2 2 0 002-2V6h1V4h-4V2H9zm0 2h6v0H9zM8 6h8v13H8V6z"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className={className}>
      <img
        src={imagePath}
        alt={productName}
        loading="lazy"
        onError={() => setHasError(true)}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
        }}
      />
    </div>
  );
}
