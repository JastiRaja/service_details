import { useState, useRef } from 'react'
import './App.css'

interface AadhaarDetails {
  aadhaarNumber: string;
  name: string;
  uscNo: string;
}

function App() {
  const [formData, setFormData] = useState<AadhaarDetails>({
    aadhaarNumber: '',
    name: '',
    uscNo: ''
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleChange = (field: keyof AadhaarDetails, value: string) => {
    // Special validation for Aadhaar number field
    if (field === 'aadhaarNumber') {
      // Only allow numbers and limit to 12 digits
      const numericValue = value.replace(/\D/g, ''); // Remove all non-digit characters
      const limitedValue = numericValue.slice(0, 12); // Limit to 12 digits
      setFormData(prev => ({
        ...prev,
        [field]: limitedValue
      }));
    } else if (field === 'uscNo') {
      // Only allow numbers and limit to 13 digits
      const numericValue = value.replace(/\D/g, ''); // Remove all non-digit characters
      const limitedValue = numericValue.slice(0, 13); // Limit to 13 digits
      setFormData(prev => ({
        ...prev,
        [field]: limitedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleClear = () => {
    setFormData({
      aadhaarNumber: '',
      name: '',
      uscNo: ''
    });
  };

  const extractAadhaarData = (text: string) => {
    // Extract 12-digit Aadhaar number
    const aadhaarMatch = text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b|\b\d{12}\b/);
    let aadhaarNumber = '';
    if (aadhaarMatch) {
      aadhaarNumber = aadhaarMatch[0].replace(/\s/g, '');
    }

    // Extract name - usually appears before or after "Government of India" or near the top
    // Common patterns: Name appears in uppercase, often on a separate line
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let name = '';
    
    // Look for name patterns (usually uppercase, 2-30 characters, contains letters)
    for (const line of lines) {
      // Skip common Aadhaar card text
      if (line.match(/GOVERNMENT OF INDIA|AADHAAR|ENROLLMENT|UIDAI|DOB|YOB|MALE|FEMALE|ADDRESS/i)) {
        continue;
      }
      // Look for lines that are mostly uppercase letters (name pattern)
      if (line.match(/^[A-Z\s]{2,30}$/) && !line.match(/^\d+$/)) {
        name = line;
        break;
      }
    }

    return { aadhaarNumber, name };
  };

  const handleScan = async () => {
    try {
      // Check if running on HTTP (not HTTPS)
      const isSecureContext = window.isSecureContext || location.protocol === 'https:';
      
      if (!isSecureContext) {
        const useNgrok = confirm(
          'Camera access requires HTTPS connection.\n\n' +
          'Options:\n' +
          '1. Use ngrok for HTTPS (Recommended)\n' +
          '2. Try enabling insecure camera access in browser settings\n\n' +
          'Would you like instructions for ngrok?'
        );
        
        if (useNgrok) {
          alert(
            'To use camera on mobile:\n\n' +
            '1. Install ngrok: https://ngrok.com/download\n' +
            '2. Run: ngrok http 5173\n' +
            '3. Use the HTTPS URL from ngrok on your mobile\n\n' +
            'Or use the local network IP with HTTPS if available.'
          );
        }
        return;
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
        return;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      setIsScannerOpen(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please grant camera permissions in your browser settings.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is being used by another application.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Camera does not support the required settings.';
      } else if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        errorMessage += 'Camera requires HTTPS connection. Please use ngrok or deploy to test camera features.';
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}`;
      }
      
      alert(errorMessage);
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    setScanProgress(0);

    try {
      // Capture frame from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsScannerOpen(false);

      // Convert canvas to image for OCR
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsScanning(false);
          return;
        }

        try {
          // Dynamically import Tesseract
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng');
          
          setScanProgress(30);

          // Perform OCR with progress tracking
          const progressInterval = setInterval(() => {
            setScanProgress(prev => {
              if (prev < 80) return prev + 5;
              return prev;
            });
          }, 200);

          const { data: { text } } = await worker.recognize(blob);
          
          clearInterval(progressInterval);
          setScanProgress(90);

          // Extract data from OCR text
          const extractedData = extractAadhaarData(text);
          
          // Update form with extracted data
          if (extractedData.aadhaarNumber) {
            setFormData(prev => ({
              ...prev,
              aadhaarNumber: extractedData.aadhaarNumber.slice(0, 12)
            }));
          }
          
          if (extractedData.name) {
            setFormData(prev => ({
              ...prev,
              name: extractedData.name
            }));
          }

          await worker.terminate();
          setScanProgress(100);

          // Show success message
          if (extractedData.aadhaarNumber || extractedData.name) {
            alert(`Scanned successfully!\n${extractedData.aadhaarNumber ? 'Aadhaar Number: ' + extractedData.aadhaarNumber + '\n' : ''}${extractedData.name ? 'Name: ' + extractedData.name : ''}\n\nPlease verify and complete the remaining fields.`);
          } else {
            alert('Could not extract Aadhaar details. Please try again or enter manually.');
          }
        } catch (error) {
          console.error('OCR Error:', error);
          alert('Error processing image. Please try again or enter manually.');
        } finally {
          setIsScanning(false);
          setScanProgress(0);
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('Capture Error:', error);
      alert('Error capturing image. Please try again.');
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const closeScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScannerOpen(false);
    setIsScanning(false);
    setScanProgress(0);
  };

  const handleSave = async () => {
    if (!formRef.current) return;

    // Validate Aadhaar number is exactly 12 digits
    if (formData.aadhaarNumber.length !== 12) {
      alert('Please enter a valid 12-digit Aadhaar number before saving.');
      return;
    }

    // Validate USC NO is exactly 13 digits
    if (formData.uscNo.length !== 13) {
      alert('Please enter a valid 13-digit USC NO before saving.');
      return;
    }

    try {
      // Dynamically import html2canvas
      // @ts-ignore - html2canvas types may not be available
      const html2canvas = (await import('html2canvas')).default;
      
      // Add capturing class to lock dimensions
      formRef.current.classList.add('capturing');
      
      // Convert inputs to display text temporarily
      const inputs = formRef.current.querySelectorAll('.input-field');
      
      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        // Create a temporary span to show the value
        const span = document.createElement('span');
        span.textContent = htmlInput.value || '';
        span.style.padding = '0.25rem 0';
        span.style.fontSize = '0.95rem';
        span.style.color = '#333';
        span.style.letterSpacing = '0.05em';
        span.style.display = 'inline-block';
        span.style.minHeight = '24px';
        span.style.width = '100%';
        htmlInput.style.display = 'none';
        htmlInput.parentElement?.appendChild(span);
      });

      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the form as image with fixed dimensions
      const canvas = await html2canvas(formRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        removeContainer: false,
        ignoreElements: (element) => {
          // Ignore buttons and other elements outside the form
          return element.classList.contains('button-container') || 
                 element.classList.contains('save-button') || 
                 element.classList.contains('clear-button');
        }
      });

      // Remove capturing class
      formRef.current.classList.remove('capturing');

      // Restore inputs
      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        htmlInput.style.display = '';
        const span = htmlInput.parentElement?.querySelector('span');
        if (span) {
          span.remove();
        }
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `aadhaar-details-${new Date().getTime()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image. Please try again.');
    }
  };

  return (
    <div className="app-container">
      <div className="aadhaar-form" ref={formRef}>
        <h2 className="form-title">ADHAR CARD DETAILS</h2>
        <table className="details-table">
          <tbody>
            <tr>
              <td className="label-cell">ADHAR NUMBER</td>
              <td className="input-cell">
                <input
                  type="text"
                  className="input-field"
                  value={formData.aadhaarNumber}
                  onChange={(e) => handleChange('aadhaarNumber', e.target.value)}
                  maxLength={12}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </td>
            </tr>
            <tr>
              <td className="label-cell">NAME</td>
              <td className="input-cell">
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </td>
            </tr>
            <tr>
              <td className="label-cell">USC NO:</td>
              <td className="input-cell">
                <input
                  type="text"
                  className="input-field"
                  value={formData.uscNo}
                  onChange={(e) => handleChange('uscNo', e.target.value)}
                  maxLength={13}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="button-container">
        <button 
          className="scan-button" 
          onClick={handleScan}
          disabled={isScannerOpen || isScanning}
        >
          📷 Scan Aadhaar Card
        </button>
        <button 
          className="save-button" 
          onClick={handleSave}
          disabled={formData.aadhaarNumber.length !== 12 || formData.uscNo.length !== 13}
        >
          Save
        </button>
        <button className="clear-button" onClick={handleClear}>Clear</button>
      </div>

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="scanner-modal">
          <div className="scanner-content">
            <div className="scanner-header">
              <h3>Scan Aadhaar Card</h3>
              <button className="close-scanner" onClick={closeScanner}>×</button>
            </div>
            <div className="scanner-video-container">
              <video ref={videoRef} autoPlay playsInline className="scanner-video" />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="scanner-overlay">
                <div className="scanner-frame"></div>
                <p className="scanner-instructions">Position the Aadhaar card within the frame</p>
              </div>
            </div>
            <div className="scanner-actions">
              <button className="capture-button" onClick={captureAndScan} disabled={isScanning}>
                {isScanning ? 'Processing...' : 'Capture & Scan'}
              </button>
              {isScanning && (
                <div className="scan-progress">
                  <div className="progress-bar" style={{ width: `${scanProgress}%` }}></div>
                  <p>Scanning: {Math.round(scanProgress)}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
