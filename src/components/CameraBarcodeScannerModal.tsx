import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { soundEngine } from '../utils/audioUtils';
import { 
  Camera, 
  X, 
  RefreshCw, 
  SwitchCamera, 
  Volume2, 
  VolumeX, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Upload, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => { success: boolean; message: string; productName?: string };
  lastScannedInfo?: { code: string; name?: string; count: number } | null;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeScanned,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isFacingEnvironment, setIsFacingEnvironment] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  
  // Feedback states
  const [lastDetection, setLastDetection] = useState<{
    code: string;
    productName?: string;
    success: boolean;
    message: string;
    timestamp: number;
  } | null>(null);
  const [sessionScanCount, setSessionScanCount] = useState<number>(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isCooldownRef = useRef<boolean>(false);
  const lastCodeScannedRef = useRef<string>('');
  const readerElementId = 'barcode-scanner-camera-view';

  // Handle scanned barcode with debounce and audio feedback
  const handleDecodedBarcode = useCallback((decodedText: string) => {
    const cleanCode = decodedText.trim();
    if (!cleanCode) return;

    // Prevent burst triggers of the same barcode within 1.5s cooldown
    const now = Date.now();
    if (isCooldownRef.current && lastCodeScannedRef.current === cleanCode) {
      return;
    }

    isCooldownRef.current = true;
    lastCodeScannedRef.current = cleanCode;

    // Dispatch to POS handler
    const result = onBarcodeScanned(cleanCode);

    if (result.success) {
      if (soundEnabled) soundEngine.playSuccessBeep();
      setSessionScanCount(prev => prev + 1);
    } else {
      if (soundEnabled) soundEngine.playErrorBeep();
    }

    setLastDetection({
      code: cleanCode,
      productName: result.productName,
      success: result.success,
      message: result.message,
      timestamp: now
    });

    // Reset cooldown after 1.4 seconds for rapid consecutive scanning of multiple items
    setTimeout(() => {
      isCooldownRef.current = false;
    }, 1400);
  }, [onBarcodeScanned, soundEnabled]);

  // Start Camera Scanning
  const startCamera = useCallback(async (cameraIdOrConfig: string | MediaTrackConstraints) => {
    setCameraError(null);
    try {
      // Clean up previous instance if running
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
        scannerRef.current = null;
      }

      // Small delay to ensure DOM container is ready
      await new Promise(res => setTimeout(res, 80));

      const readerElem = document.getElementById(readerElementId);
      if (!readerElem) return;

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth * 0.85, 340);
          const height = Math.min(viewfinderHeight * 0.55, 180);
          return { width, height };
        },
        aspectRatio: 1.333333
      };

      await html5QrCode.start(
        cameraIdOrConfig,
        config,
        (decodedText) => {
          handleDecodedBarcode(decodedText);
        },
        () => {
          // Normal frame parse misses
        }
      );

      setIsScanning(true);

      // Check if torch/flashlight is supported
      try {
        const track = (html5QrCode as any).getRunningTrackCameraCapabilities?.();
        if (track && track.torchFeature?.().isSupported()) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      } catch {
        setTorchSupported(false);
      }

    } catch (err: any) {
      console.error('Error starting camera scanner:', err);
      setIsScanning(false);
      let msg = 'No se pudo inicializar la cámara.';
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
        msg = 'Permiso denegado para acceder a la cámara. Por favor autoriza el uso de la cámara en el navegador.';
      } else if (err?.name === 'NotFoundError' || err?.message?.includes('not found')) {
        msg = 'No se detectó ninguna cámara disponible en este dispositivo.';
      } else if (err?.message) {
        msg = `Error de cámara: ${err.message}`;
      }
      setCameraError(msg);
    }
  }, [handleDecodedBarcode]);

  // Stop Camera Scanning
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Stop error:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setTorchEnabled(false);
  }, []);

  // Initialize and list cameras when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setLastDetection(null);
      setSessionScanCount(0);
      return;
    }

    let isMounted = true;

    async function init() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isMounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment/back camera if found, else first camera
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('environment')
          );
          const initialId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(initialId);
          startCamera(initialId);
        } else if (isMounted) {
          // Fallback to standard facingMode
          startCamera({ facingMode: 'environment' });
        }
      } catch (err) {
        console.warn('getCameras error, falling back to facingMode: environment', err);
        if (isMounted) {
          startCamera({ facingMode: 'environment' });
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Switch camera toggle (front / back)
  const handleToggleFacingMode = () => {
    const nextFacing = !isFacingEnvironment;
    setIsFacingEnvironment(nextFacing);
    startCamera({ facingMode: nextFacing ? 'environment' : 'user' });
  };

  // Switch specific camera device from select
  const handleSelectCamera = (camId: string) => {
    setSelectedCameraId(camId);
    startCamera(camId);
  };

  // Toggle Torch
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !torchSupported) return;
    try {
      const nextTorch = !torchEnabled;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchEnabled(nextTorch);
    } catch (e) {
      console.warn('Could not toggle torch:', e);
    }
  };

  // Allow uploading a barcode photo from disk
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = scannerRef.current || new Html5Qrcode(readerElementId);
      const decodedResult = await html5QrCode.scanFile(file, true);
      handleDecodedBarcode(decodedResult);
    } catch (err: any) {
      setLastDetection({
        code: 'No detectado',
        success: false,
        message: 'No se reconoció ningún código de barras válido en la imagen seleccionada.',
        timestamp: Date.now()
      });
      if (soundEnabled) soundEngine.playErrorBeep();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#16161A] border border-[#27272A] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#27272A] flex items-center justify-between bg-[#111114]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Lector de Código de Barras con Cámara</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Apunta al código del artículo para agregarlo automáticamente al carrito
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Controls Toolbar */}
        <div className="px-4 py-2.5 bg-[#0F0F12] border-b border-[#27272A] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            {cameras.length > 1 ? (
              <select
                value={selectedCameraId}
                onChange={e => handleSelectCamera(e.target.value)}
                className="bg-[#1A1A1E] border border-[#27272A] rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 flex-1 truncate"
              >
                {cameras.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Cámara ${i + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <button
                onClick={handleToggleFacingMode}
                className="px-2.5 py-1 bg-[#1A1A1E] hover:bg-[#27272A] text-zinc-300 rounded-lg border border-[#27272A] flex items-center gap-1.5 transition-colors"
                title="Cambiar entre cámara frontal y trasera"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFacingEnvironment ? 'Cámara Trasera' : 'Cámara Frontal'}</span>
              </button>
            )}

            <button
              onClick={() => startCamera(selectedCameraId || { facingMode: isFacingEnvironment ? 'environment' : 'user' })}
              className="p-1.5 bg-[#1A1A1E] hover:bg-[#27272A] text-zinc-300 rounded-lg border border-[#27272A] transition-colors"
              title="Reiniciar cámara"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? '' : 'animate-spin text-emerald-400'}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {torchSupported && (
              <button
                onClick={handleToggleTorch}
                className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                  torchEnabled 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-[#1A1A1E] text-zinc-400 border-[#27272A] hover:text-white'
                }`}
                title="Encender linterna / flash"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Flash</span>
              </button>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-[#1A1A1E] text-zinc-500 border-[#27272A]'
              }`}
              title={soundEnabled ? 'Sonido de escaneo activo' : 'Sonido desactivado'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Subir archivo de imagen con código de barras */}
            <label 
              className="px-2.5 py-1 bg-[#1A1A1E] hover:bg-[#27272A] text-zinc-300 rounded-lg border border-[#27272A] cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Leer código de barras desde una foto"
            >
              <Upload className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Foto</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Video / Scanner Container */}
        <div className="relative bg-black flex-1 min-h-[300px] max-h-[380px] overflow-hidden flex items-center justify-center">
          {/* HTML5 QRCODE Video DOM Target */}
          <div 
            id={readerElementId} 
            className="w-full h-full overflow-hidden [&>video]:w-full [&>video]:h-full [&>video]:object-cover" 
          />

          {/* Scanner Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Guide Framing Box */}
            <div className="relative w-[280px] h-[160px] sm:w-[320px] sm:h-[180px] border-2 border-emerald-500/70 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] flex flex-col justify-between p-2">
              {/* Corner accents */}
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
              <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
              <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
              <div className="w-full text-center text-[10px] font-mono text-emerald-300/80 bg-black/60 backdrop-blur-xs py-0.5 rounded">
                COLOCA EL CÓDIGO DE BARRAS AQUÍ
              </div>
            </div>
          </div>

          {/* Camera Error Message Banner */}
          {cameraError && (
            <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-semibold text-white max-w-xs">{cameraError}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => startCamera(selectedCameraId || { facingMode: 'environment' })}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reintentar Acceso</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Feedback Notification Banner */}
        <div className="p-3.5 bg-[#111114] border-t border-[#27272A] space-y-2">
          {lastDetection ? (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between transition-all animate-in fade-in duration-150 ${
                lastDetection.success
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/40 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {lastDetection.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {lastDetection.success
                      ? `✓ ${lastDetection.productName || 'Producto'}`
                      : 'Código no encontrado'}
                  </div>
                  <div className="text-[11px] opacity-80 font-mono truncate">
                    {lastDetection.message || `Cód: ${lastDetection.code}`}
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-zinc-400 shrink-0 ml-2">
                {lastDetection.code}
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-[#16161A] border border-[#27272A] text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Escáner continuo activo: pasa tus productos uno tras otro</span>
            </div>
          )}

          {/* Footer stats & Close button */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Cargados en esta sesión:</span>
              <strong className="text-emerald-400 font-mono text-sm">{sessionScanCount}</strong>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Finalizar Escaneo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
