// frontend/src/components/store/FAQSetupWizard.tsx
import React, { useState } from 'react';
import { MessageSquare, CheckCircle, Zap } from 'lucide-react';
import api from '../../../lib/api';

const FAQSetupWizard: React.FC<{ storeId: string; onComplete: () => void }> = ({ storeId, onComplete }) => {
  const [loading, setLoading] = useState(false);
  
  const sampleFAQs = [
    {
      question: "How to cancel my order?",
      answer: "You can cancel your order within 24 hours of placement. Go to 'My Orders', find the order you want to cancel, and click 'Cancel Order'. If more than 24 hours have passed, please contact us directly.",
      keywords: ["cancel", "cancellation", "stop order"],
      triggers: ["how to cancel", "cancel order"],
      category: "cancellation"
    },
    {
      question: "How to edit my design?",
      answer: "You can edit your design before checkout. Go to the design editor, make your changes, and save. If you need to edit after ordering, contact us within 2 hours of order placement.",
      keywords: ["edit", "change design", "modify"],
      triggers: ["edit design", "change design", "modify design"],
      category: "design"
    },
    {
      question: "Payment issues?",
      answer: "If you're having payment issues: 1) Check your card details 2) Ensure sufficient funds 3) Try a different payment method. If problems persist, contact your bank or try again in 10 minutes.",
      keywords: ["payment", "failed payment", "card declined"],
      triggers: ["payment failed", "card declined", "payment issue"],
      category: "payment"
    },
    {
      question: "Delivery & tracking?",
      answer: "Orders are processed within 1-2 business days. You'll receive a tracking number via email once shipped. Delivery takes 3-7 business days. For tracking updates, check your order page or the carrier's website.",
      keywords: ["delivery", "shipping", "track", "eta"],
      triggers: ["delivery time", "track order", "when will it arrive"],
      category: "delivery"
    }
  ];

  const setupSampleFAQs = async () => {
    setLoading(true);
    try {
      for (const faq of sampleFAQs) {
        await api.post('/faq', {
          storeId,
          ...faq,
          isActive: true,
          order: sampleFAQs.indexOf(faq)
        });
      }
      onComplete();
    } catch (error) {
      console.error('Failed to setup FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 mb-8 border border-blue-200 dark:border-gray-700">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Set Up Automated Responses</h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Get started quickly with pre-made FAQs for common customer questions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {sampleFAQs.map((faq, index) => (
          <div key={index} className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                faq.category === 'cancellation' ? 'bg-red-100 dark:bg-red-900/30' :
                faq.category === 'design' ? 'bg-purple-100 dark:bg-purple-900/30' :
                faq.category === 'payment' ? 'bg-green-100 dark:bg-green-900/30' :
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">{faq.question}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{faq.answer}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {faq.keywords.slice(0, 2).map((keyword, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm">These FAQs will be automatically enabled</span>
        </div>
        <button
          onClick={setupSampleFAQs}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Setting Up...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Setup Sample FAQs
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FAQSetupWizard;