import { Document, Page, pdfjs } from 'react-pdf';
import { Box, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { useState } from 'react';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import React from 'react';

// console.log()
// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `../../../node_modules/pdfjs-dist/build`;

interface PdfViewerProps {
  fileUrl: string;
}

const PdfViewer = ({ fileUrl }: PdfViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    setError(error.message);
    setIsLoading(false);
  };

  return (
    <Box position="relative" h="100%">
      {isLoading && (
        <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
          <Spinner size="xl" />
        </Box>
      )}

      {error && (
        <Alert status="error">
          <AlertIcon />
          Failed to load PDF: {error}
        </Alert>
      )}

      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        onSourceError={onDocumentLoadError}
      >
        {Array.from(new Array(numPages), (_, index) => (
          <Page
            key={`page_${index + 1}`}
            pageNumber={index + 1}
            width={800} // Adjust based on your container size
            loading={
              <Box textAlign="center">
                <Spinner size="xl" />
              </Box>
            }
          />
        ))}
      </Document>
    </Box>
  );
};

export default PdfViewer;