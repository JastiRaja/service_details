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

  const formRef = useRef<HTMLDivElement>(null);

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
      // Only allow numbers for USC NO
      const numericValue = value.replace(/\D/g, ''); // Remove all non-digit characters
      setFormData(prev => ({
        ...prev,
        [field]: numericValue
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

  const handleSave = async () => {
    if (!formRef.current) return;

    // Validate Aadhaar number is exactly 12 digits
    if (formData.aadhaarNumber.length !== 12) {
      alert('Please enter a valid 12-digit Aadhaar number before saving.');
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
          className="save-button" 
          onClick={handleSave}
          disabled={formData.aadhaarNumber.length !== 12}
        >
          Save
        </button>
        <button className="clear-button" onClick={handleClear}>Clear</button>
      </div>
    </div>
  )
}

export default App
