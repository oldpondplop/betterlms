import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Skeleton,
  Spinner,
  Alert,
  AlertIcon,
  Grid,
  Card,
  CardBody,
  CardFooter,
  Button,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CoursesService, type CourseDetailed, type UserPublic } from "../../client";
import Navbar from "../../components/Common/Navbar";
import OpenMaterialsViewer from "../../components/Common/OpenMaterialsViewer";
import TakeQuiz from "../../components/Common/TakeQuiz";

export const Route = createFileRoute("/_layout/mycourse")({
  component: Course,
});

function CourseCard({ course }: { course: CourseDetailed }) {
  const { isOpen: isMaterialsOpen, onOpen: onMaterialsOpen, onClose: onMaterialsClose } = useDisclosure();
  const { isOpen: isQuizOpen, onOpen: onQuizOpen, onClose: onQuizClose } = useDisclosure();
  const materials = course.materials || [];

  return (
    <Card>
      <CardBody>
        <Heading size="md">{course.title}</Heading>
        <Text>{course.description || "No description"}</Text>
        <Flex gap={2} mt={2}>
          <Box
            w="2"
            h="2"
            borderRadius="50%"
            bg={course.is_active ? "ui.success" : "ui.danger"}
            alignSelf="center"
          />
          <Text>{course.is_active ? "Active" : "Inactive"}</Text>
        </Flex>
      </CardBody>
      <CardFooter>
        <Flex gap={2}>
          <Button
            colorScheme="blue"
            onClick={onMaterialsOpen}
            isDisabled={materials.length === 0}
          >
            Open Materials
          </Button>
          <Button colorScheme="green" onClick={onQuizOpen}>
            Take Quiz
          </Button>
        </Flex>
      </CardFooter>

      <OpenMaterialsViewer courseId={course.id} isOpen={isMaterialsOpen} onClose={onMaterialsClose} />
      <TakeQuiz courseId={course.id} isOpen={isQuizOpen} onClose={onQuizClose} />
      </Card>
  );
}

function CoursesGrid() {
  const {
    data: courses,
    isPending,
    error,
  } = useQuery({
    queryKey: ["userCourses"],
    queryFn: () => CoursesService.getUserCourses(),
  });

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading courses: {error.message}
      </Alert>
    );
  }

  return (
    <Grid templateColumns="repeat(3, 1fr)" gap={6}>
      {isPending
        ? Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardBody>
                <Skeleton height="20px" mb={4} />
                <Skeleton height="20px" mb={4} />
                <Skeleton height="20px" />
              </CardBody>
              <CardFooter>
                <Skeleton height="40px" width="100%" />
              </CardFooter>
            </Card>
          ))
        : courses?.map((course) => <CourseCard key={course.id} course={course} />)}
    </Grid>
  );
}

function Course() {
  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
        My Courses
      </Heading>
      <Navbar type="Course" addModalAs={"symbol"} />
      <CoursesGrid />
    </Container>
  );
}

export default Course;