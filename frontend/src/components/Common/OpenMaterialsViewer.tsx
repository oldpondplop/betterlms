import { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Button,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  Heading,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { CoursesService } from "../../client";

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `../../node_modules/pdfjs-dist/build/pdf.worker.mjs`;

interface OpenMaterialsViewerProps {
  courseId: string; // Add courseId to props
  isOpen: boolean;
  onClose: () => void;
}

const OpenMaterialsViewer = ({ courseId, isOpen, onClose }: OpenMaterialsViewerProps) => {
  const [materials, setMaterials] = useState<string[]>([]);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | null>(null); // State to store the PDF file

  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    if (isOpen) {
      // Fetch the list of materials when the drawer is opened
      CoursesService.listMaterials({ courseId })
        .then((filenames) => {
          setMaterials(filenames);
          setIsLoading(false);
        })
        .catch((error) => {
          setError("Failed to fetch materials");
          setIsLoading(false);
          console.error(error);
        });
    }
  }, [isOpen, courseId]);

  // Update this useEffect
  useEffect(() => {
    if (materials.length > 0) {
      const fetchPdfUrl = async () => {
        try {
          setIsLoading(true);
          const filename = materials[currentMaterialIndex];

          // CORRECTED URL PATH
          const pdfUrl = `${
            import.meta.env.VITE_API_URL
          }/api/v1/courses/materials/${filename}`; // Added /api/v1/

          console.log("Final PDF URL:", pdfUrl);

          setPdfFile(pdfUrl);
          setIsLoading(false);
        } catch (error) {
          setError("Failed to load PDF");
          setIsLoading(false);
          console.error("PDF fetch error:", error);
        }
      };

      fetchPdfUrl();
    }
  }, [materials, currentMaterialIndex]);

  const handleMaterialClick = (index: number) => {
    setCurrentMaterialIndex(index);
    setCurrentPage(1); // Reset to the first page when switching materials
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="full">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>Course Materials</DrawerHeader>
        <DrawerBody>
          <Flex h="100%">
            {/* Sidebar */}
            <Box w="250px" borderRight="1px solid" borderColor="gray.200" p={4}>
              <Heading size="sm" mb={4}>
                Materials
              </Heading>
              {materials.map((_material, index) => (
                <Button
                  key={index}
                  w="100%"
                  mb={2}
                  variant={currentMaterialIndex === index ? "solid" : "outline"}
                  onClick={() => handleMaterialClick(index)}
                >
                  Material {index + 1}
                </Button>
              ))}
            </Box>

            {/* PDF Viewer */}
            <Box flex={1} p={4} position="relative" overflowY="auto">
              {isLoading && (
                <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
                  <Spinner size="xl" />
                </Box>
              )}

              {error && (
                <Alert status="error">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              {pdfFile && (
                <Box
                  borderRadius="lg"
                  overflow="hidden"
                  boxShadow="md"
                  maxW="800px"
                  mx="auto"
                  bg="white"
                >
                  <Document
                    file={pdfFile} // Pass the fetched PDF file
                    onLoadSuccess={({ numPages }) => {
                      setNumPages(numPages);
                      setIsLoading(false);
                    }}
                    onLoadError={(error) => {
                      setError(error.message);
                      setIsLoading(false);
                    }}
                  >
                    {!isMobile ? (
                      // Render all pages for desktop with scrolling
                      Array.from(new Array(numPages), (_el, index) => (
                        <Box key={`page_${index + 1}`} mb={4}>
                          <Page
                            pageNumber={index + 1}
                            width={Math.min(800, window.innerWidth * 0.8)}
                          />
                        </Box>
                      ))
                    ) : (
                      // Render single page for mobile with pagination
                      <Page
                        pageNumber={currentPage}
                        width={Math.min(800, window.innerWidth * 0.9)}
                      />
                    )}
                  </Document>
                </Box>
              )}

              {/* Pagination Controls for Mobile */}
              {isMobile && pdfFile && (
                <Flex justify="center" mt={4} gap={4}>
                  <Button onClick={handlePreviousPage} isDisabled={currentPage === 1}>
                    Previous
                  </Button>
                  <Text>
                    Page {currentPage} of {numPages || "..."}
                  </Text>
                  <Button onClick={handleNextPage} isDisabled={currentPage === numPages}>
                    Next
                  </Button>
                </Flex>
              )}
            </Box>
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default OpenMaterialsViewer;