import React from 'react';

const TermsConditions: React.FC = () => {
  const sections = [
    {
      title: "Nature of the Platform",
      content: (
        <>
          <p className="mb-4">
            PrintEase is an online platform that allows independent Print Shops ("Merchants") to create online storefronts and allows Customers ("Users") to upload files and purchase printing services.
          </p>
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <h3 className="font-semibold text-gray-800 mb-2">Important Disclaimer:</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">We are a Venue:</span> PrintEase provides the technical infrastructure (SaaS). We are not a print shop, we do not print materials, and we do not fulfill orders.
              </li>
              <li>
                <span className="font-medium">Contracts are between User and Merchant:</span> Any contract for sale, printing, or service is strictly between the Customer and the specific Print Shop. PrintEase is not a party to that transaction.
              </li>
              <li>
                <span className="font-medium">No Control:</span> We do not have control over, and do not guarantee the quality, safety, or legality of items advertised, the truth or accuracy of listings, or the ability of Print Shops to sell items.
              </li>
            </ul>
          </div>
        </>
      )
    },
    // Add other sections similarly
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms and Conditions</h1>
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-8">
          Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the www.printease.com website (the "Service") operated by PrintEase ("us", "we", or "our").
        </p>
        
        <p className="mb-6">
          Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, print shops, and others who access or use the Service.
        </p>
        
        <p className="mb-8 font-semibold">
          By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
        </p>

        {sections.map((section, index) => (
          <section key={index} className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {index + 1}. {section.title}
            </h2>
            {section.content}
          </section>
        ))}

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us:
          </p>
          <p className="mt-2">
            By visiting this page on our website: printease.com/about-us
          </p>
        </section>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;