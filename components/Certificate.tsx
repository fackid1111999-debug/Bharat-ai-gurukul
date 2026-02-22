
import React, { useRef, useEffect } from 'react';
import { UserProgress } from '../types';

interface CertificateProps {
  progress: UserProgress;
  onDownload: () => void;
}

const Certificate: React.FC<CertificateProps> = ({ progress, onDownload }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = async () => {
      // Background - Saffron to White Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#FFF7ED');
      grad.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border
      ctx.strokeStyle = '#F97316';
      ctx.lineWidth = 20;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Header Text
      ctx.fillStyle = '#1E1B4B';
      ctx.font = 'bold 60px Philosopher';
      ctx.textAlign = 'center';
      ctx.fillText('BHARAT AI-GURUKUL', canvas.width / 2, 150);

      ctx.fillStyle = '#F97316';
      ctx.font = '30px Inter';
      ctx.fillText('OFFICIAL CERTIFICATE OF MASTERY', canvas.width / 2, 200);

      // Main Text
      ctx.fillStyle = '#374151';
      ctx.font = '24px Inter';
      ctx.fillText('This is to certify that', canvas.width / 2, 300);

      ctx.fillStyle = '#1E1B4B';
      ctx.font = 'bold 50px Inter';
      ctx.fillText(progress.name.toUpperCase(), canvas.width / 2, 370);

      ctx.fillStyle = '#374151';
      ctx.font = '24px Inter';
      ctx.fillText(`S/O / D/O Shri ${progress.fatherName}`, canvas.width / 2, 430);

      ctx.fillText('has successfully completed the 100-Stage course in', canvas.width / 2, 500);
      
      ctx.fillStyle = '#0D9488';
      ctx.font = 'bold 40px Inter';
      ctx.fillText(progress.currentCourse, canvas.width / 2, 560);

      // Selfie
      if (progress.selfieUrl) {
        const img = new Image();
        img.src = progress.selfieUrl;
        img.onload = () => {
          ctx.drawImage(img, (canvas.width / 2) - 100, 600, 200, 200);
          // QR Mockup
          ctx.fillStyle = '#000';
          ctx.fillRect(canvas.width - 200, canvas.height - 200, 100, 100);
          ctx.fillStyle = '#fff';
          ctx.fillText('VERIFIED', canvas.width - 150, canvas.height - 80);
        };
      }
    };

    render();
  }, [progress]);

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-2xl overflow-hidden">
      <canvas ref={canvasRef} width={800} height={1100} className="w-full max-w-lg border border-gray-200 shadow-inner" />
      <button 
        onClick={onDownload}
        className="mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-10 rounded-full shadow-lg transition-all"
      >
        Download Certificate (PDF)
      </button>
    </div>
  );
};

export default Certificate;
