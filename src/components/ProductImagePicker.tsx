import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  Globe,
  Link2,
  Search,
  X,
  Check,
  Package,
  Image as ImageIcon,
  Laptop,
  Sparkles,
  ExternalLink,
  Trash2
} from 'lucide-react';

interface ProductImagePickerProps {
  currentImageUrl?: string;
  productName?: string;
  onSelectImage: (url: string) => void;
  onClose: () => void;
}

// Catálogo curado de imágenes de productos de alta resolución comerciales (Unsplash)
const CURATED_PRODUCT_IMAGES: {
  title: string;
  category: string;
  keywords: string[];
  url: string;
}[] = [
  // Bebidas & Gaseosas
  {
    title: 'Gaseosa Cola',
    category: 'Bebidas',
    keywords: ['coca', 'cola', 'gaseosa', 'refresco', 'soda', 'bebida', 'lata'],
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Agua Mineral en Botella',
    category: 'Bebidas',
    keywords: ['agua', 'mineral', 'botella', 'bebida', 'h2o', 'hidratacion'],
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Jugo Natural de Naranja',
    category: 'Bebidas',
    keywords: ['jugo', 'naranja', 'citrico', 'bebida', 'desayuno'],
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Cerveza en Lata / Botella',
    category: 'Bebidas',
    keywords: ['cerveza', 'beer', 'lata', 'artesanal', 'alcohol', 'bebida'],
    url: 'https://images.unsplash.com/photo-1608270116843-03b0c6095982?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Vino Tinto Botella',
    category: 'Bebidas',
    keywords: ['vino', 'tinto', 'malbec', 'copa', 'bodega', 'botella'],
    url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Café Tostado en Granos',
    category: 'Almacén',
    keywords: ['cafe', 'granos', 'tostado', 'molido', 'infusion'],
    url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Paquete de Café Molido',
    category: 'Almacén',
    keywords: ['cafe', 'paquete', 'desayuno', 'molido', 'taza'],
    url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=600&auto=format&fit=crop&q=80'
  },

  // Almacén & Granos
  {
    title: 'Arroz Blanco / Integral',
    category: 'Almacén',
    keywords: ['arroz', 'granos', 'cereal', 'almacen', 'comida'],
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Fideos / Pastas Secas',
    category: 'Almacén',
    keywords: ['pasta', 'fideos', 'tallarines', 'spaghetti', 'harina', 'almacen'],
    url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Aceite de Oliva / Girasol',
    category: 'Almacén',
    keywords: ['aceite', 'oliva', 'girasol', 'cocina', 'botella', 'aderezo'],
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Harina de Trigo',
    category: 'Almacén',
    keywords: ['harina', 'trigo', 'panaderia', 'polvo', 'reposteria', '000', '0000'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Azúcar Blanco',
    category: 'Almacén',
    keywords: ['azucar', 'endulzante', 'dulce', 'almacen'],
    url: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Sal Marina / Fina',
    category: 'Almacén',
    keywords: ['sal', 'fina', 'gruesa', 'condimento', 'cocina'],
    url: 'https://images.unsplash.com/photo-1626197031507-c1707cb4d4d1?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Salsa de Tomate / Puré',
    category: 'Almacén',
    keywords: ['tomate', 'salsa', 'pure', 'conserva', 'lata', 'botella'],
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22509?w=600&auto=format&fit=crop&q=80'
  },

  // Lácteos & Frescos
  {
    title: 'Leche Entera / Descremada',
    category: 'Lácteos',
    keywords: ['leche', 'lacteo', 'botella', 'sachet', 'desayuno'],
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Queso en Barra / Trozo',
    category: 'Lácteos',
    keywords: ['queso', 'barra', 'cremoso', 'holanda', 'lacteo', 'fiambreria'],
    url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Yogur / Bebible',
    category: 'Lácteos',
    keywords: ['yogur', 'yogurt', 'frutilla', 'lacteo', 'postre'],
    url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Huevos de Granja',
    category: 'Frescos',
    keywords: ['huevos', 'maple', 'granja', 'frescos', 'docena'],
    url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600&auto=format&fit=crop&q=80'
  },

  // Panadería & Galletitas
  {
    title: 'Pan de Molde / Francés',
    category: 'Panadería',
    keywords: ['pan', 'baguette', 'molde', 'panaderia', 'harina', 'tostadas'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Galletitas Dulces / Cookies',
    category: 'Golosinas',
    keywords: ['galletitas', 'galletas', 'cookies', 'chocolate', 'dulce', 'merienda'],
    url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Tableta de Chocolate',
    category: 'Golosinas',
    keywords: ['chocolate', 'tableta', 'cacao', 'dulce', 'golosina'],
    url: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Papas Fritas / Snacks',
    category: 'Snacks',
    keywords: ['papas', 'fritas', 'snack', 'lays', 'copetin', 'bolsa'],
    url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80'
  },

  // Frutas & Verduras
  {
    title: 'Manzanas Rojas',
    category: 'Frutas',
    keywords: ['manzana', 'fruta', 'roja', 'verduleria'],
    url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Bananas',
    category: 'Frutas',
    keywords: ['banana', 'platano', 'fruta', 'verduleria'],
    url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Tomates Frescos',
    category: 'Verduras',
    keywords: ['tomate', 'verdura', 'ensalada', 'fresco'],
    url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80'
  },

  // Limpieza & Cuidado Personal
  {
    title: 'Detergente Líquido Lavavajillas',
    category: 'Limpieza',
    keywords: ['detergente', 'limpieza', 'vajilla', 'platos', 'espuma'],
    url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Jabón en Barra / Líquido',
    category: 'Limpieza',
    keywords: ['jabon', 'tocador', 'manos', 'bano', 'limpieza'],
    url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Shampoo / Acondicionador',
    category: 'Cuidado Personal',
    keywords: ['shampoo', 'acondicionador', 'cabello', 'bano', 'higiene'],
    url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Lavandina / Desinfectante',
    category: 'Limpieza',
    keywords: ['lavandina', 'cloro', 'desinfectante', 'limpieza', 'piso'],
    url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Papel Higiénico / Rollos',
    category: 'Limpieza',
    keywords: ['papel', 'higienico', 'rollo', 'bano', 'cocina', 'servilleta'],
    url: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=600&auto=format&fit=crop&q=80'
  },

  // Ferretería & Herramientas
  {
    title: 'Taladro Percutor Eléctrico',
    category: 'Ferretería',
    keywords: ['taladro', 'herramienta', 'percutor', 'ferreteria', 'electrico'],
    url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Martillo de Mano',
    category: 'Ferretería',
    keywords: ['martillo', 'herramienta', 'clavo', 'carpinteria'],
    url: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Juego de Destornilladores',
    category: 'Ferretería',
    keywords: ['destornillador', 'herramientas', 'taller', 'tornillo'],
    url: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Pintura Látex en Lata',
    category: 'Ferretería',
    keywords: ['pintura', 'latex', 'lata', 'pincel', 'rodillo', 'pared'],
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80'
  },
  {
    title: 'Cinta Métrica / Flexómetro',
    category: 'Ferretería',
    keywords: ['cinta', 'metrica', 'metro', 'medicion', 'herramienta'],
    url: 'https://images.unsplash.com/photo-1586864387789-628af9feed72?w=600&auto=format&fit=crop&q=80'
  }
];

export const ProductImagePicker: React.FC<ProductImagePickerProps> = ({
  currentImageUrl = '',
  productName = '',
  onSelectImage,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'computer' | 'web' | 'url'>('computer');
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string>(currentImageUrl);

  // Web search state
  const [searchQuery, setSearchQuery] = useState<string>(productName || '');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Manual URL state
  const [manualUrlInput, setManualUrlInput] = useState<string>(currentImageUrl || '');
  const [urlError, setUrlError] = useState<boolean>(false);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter internet images
  const filteredWebImages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return CURATED_PRODUCT_IMAGES.filter(item => {
      const matchesCategory = selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.keywords.some(k => k.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategoryFilter]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(CURATED_PRODUCT_IMAGES.map(i => i.category));
    return ['all', ...Array.from(set)];
  }, []);

  // Process and optimize file from computer
  const handleProcessFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc.).');
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();

    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // Redimensionar suavemente en un canvas a max 600x600 para alta calidad y almacenamiento ultraligero
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedPreviewUrl(compressedDataUrl);
        } else {
          setSelectedPreviewUrl(e.target?.result as string);
        }
        setIsProcessingFile(false);
      };

      img.onerror = () => {
        setIsProcessingFile(false);
        alert('No se pudo decodificar la imagen seleccionada.');
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessingFile(false);
      alert('Error al leer el archivo desde el ordenador.');
    };

    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    onSelectImage(selectedPreviewUrl);
    onClose();
  };

  // Clear image
  const handleClearImage = () => {
    setSelectedPreviewUrl('');
    onSelectImage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#16161A] border border-[#27272A] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#27272A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Imagen del Artículo</h3>
              <p className="text-[11px] text-zinc-400">
                Elige una imagen desde tu ordenador, búscala en internet o ingresa un enlace directo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-4 pt-3 border-b border-[#27272A] bg-[#121215] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('computer')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'computer'
                  ? 'border-emerald-500 text-emerald-400 bg-[#16161A]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desde el Ordenador</span>
            </button>

            <button
              onClick={() => setActiveTab('web')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'web'
                  ? 'border-emerald-500 text-emerald-400 bg-[#16161A]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Buscar en Internet</span>
            </button>

            <button
              onClick={() => setActiveTab('url')}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'url'
                  ? 'border-emerald-500 text-emerald-400 bg-[#16161A]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Enlace / URL</span>
            </button>
          </div>

          {/* Quick Clear Button if image exists */}
          {selectedPreviewUrl && (
            <button
              onClick={() => setSelectedPreviewUrl('')}
              className="text-[11px] text-red-400 hover:text-red-300 pb-1 flex items-center gap-1 transition-colors"
              title="Quitar imagen actual"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Quitar imagen</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: DESDE EL ORDENADOR */}
          {activeTab === 'computer' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
              />

              {/* Drag and drop box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 hover:border-zinc-500 bg-[#0A0A0B]'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 rounded-2xl bg-zinc-800 text-zinc-300 border border-zinc-700">
                    <Upload className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {isProcessingFile
                        ? 'Optimizando imagen...'
                        : 'Haz clic para seleccionar o arrastra una foto aquí'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Compatible con JPG, PNG, WEBP, GIF (Se optimiza automáticamente para carga instantánea)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
                  >
                    Examinar Archivos de mi PC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUSCAR EN INTERNET */}
          {activeTab === 'web' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar por artículo o palabra clave (ej: coca, vino, arroz, fideos, taladro)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <select
                  value={selectedCategoryFilter}
                  onChange={e => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid of Results */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Imágenes encontradas: <strong>{filteredWebImages.length}</strong></span>
                  <span className="text-zinc-500">Haz clic en cualquier imagen para seleccionarla</span>
                </div>

                {filteredWebImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto p-1">
                    {filteredWebImages.map((item, idx) => {
                      const isSelected = selectedPreviewUrl === item.url;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedPreviewUrl(item.url)}
                          className={`relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all aspect-square bg-[#0A0A0B] ${
                            isSelected
                              ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                              : 'border-zinc-800 hover:border-zinc-600'
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                            <span className="text-[10px] font-bold text-white line-clamp-1">
                              {item.title}
                            </span>
                            <span className="text-[9px] text-zinc-400">{item.category}</span>
                          </div>

                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-emerald-500 text-black shadow-lg">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#0A0A0B] rounded-xl border border-[#27272A] space-y-2">
                    <Search className="w-6 h-6 text-zinc-600 mx-auto" />
                    <p className="text-xs font-semibold text-zinc-300">Sin resultados para "{searchQuery}"</p>
                    <p className="text-[11px] text-zinc-500">
                      Prueba con términos generales como bebida, pan, aceite, café, queso o limpia la búsqueda.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ENLACE / URL DIRECTA */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Dirección URL de la Imagen
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/foto-producto.jpg"
                    value={manualUrlInput}
                    onChange={e => {
                      setManualUrlInput(e.target.value);
                      setSelectedPreviewUrl(e.target.value);
                      setUrlError(false);
                    }}
                    className="flex-1 px-3 py-2 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualUrlInput.trim()) {
                        setSelectedPreviewUrl(manualUrlInput.trim());
                      }
                    }}
                    className="px-3 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-colors"
                  >
                    Verificar
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Puedes buscar imágenes en Google Imágenes o páginas web, hacer clic derecho &gt; "Copiar dirección de la imagen" y pegarla aquí.
                </p>
              </div>
            </div>
          )}

          {/* PREVIEW BOX */}
          <div className="p-3.5 bg-[#0A0A0B] rounded-xl border border-[#27272A] flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
              {selectedPreviewUrl ? (
                <img
                  src={selectedPreviewUrl}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setUrlError(true)}
                />
              ) : (
                <Package className="w-6 h-6 text-zinc-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">
                  {selectedPreviewUrl ? 'Imagen Seleccionada' : 'Sin imagen seleccionada'}
                </span>
                {selectedPreviewUrl && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                    Listo para asignar
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {selectedPreviewUrl
                  ? selectedPreviewUrl.startsWith('data:')
                    ? 'Imagen cargada desde tu ordenador'
                    : selectedPreviewUrl
                  : 'Selecciona una imagen desde el ordenador o internet.'}
              </p>
              {urlError && (
                <p className="text-[10px] text-red-400 mt-0.5">
                  Aviso: El enlace podría no ser una imagen accesible públicamente.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#121215] border-t border-[#27272A] flex items-center justify-between gap-3">
          <div>
            {currentImageUrl && (
              <button
                type="button"
                onClick={handleClearImage}
                className="px-3 py-2 text-red-400 hover:text-red-300 text-xs font-semibold rounded-xl hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Foto del Artículo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1F1F23] hover:bg-[#27272A] text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Usar esta Imagen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
