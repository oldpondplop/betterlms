import {
  Box,
  Container,
  Flex,
  Heading,
  Skeleton,
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
import { CoursesService, QuizzesService, type CourseDetailed } from "../../client";
import Navbar from "../../components/Common/Navbar";
import OpenMaterialsViewer from "../../components/Common/OpenMaterialsViewer";
import TakeQuiz from "../../components/Common/TakeQuiz";
import useAuth from "../../hooks/useAuth";

export const Route = createFileRoute("/_layout/mycourse")({
  component: Course,
});

function CourseCard({ course }: { course: CourseDetailed }) {
  const { isOpen: isMaterialsOpen, onOpen: onMaterialsOpen, onClose: onMaterialsClose } = useDisclosure();
  const { isOpen: isQuizOpen, onOpen: onQuizOpen, onClose: onQuizClose } = useDisclosure();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user has access to this course
  const hasAccess = (course.users ?? []).some(u => u.id === user?.id) || 
                    (course.roles ?? []).some(r => r.id === user?.role_id);

  const { data: quizAttempts } = useQuery({
    queryKey: ["quizAttempts", course.quiz?.id],
    enabled: !!course.quiz?.id && hasAccess,
    queryFn: async () => {
      if (!course.quiz?.id) return [];
      return await QuizzesService.getQuizAttempts({
        quizId: course.quiz.id,
        skip: 0,
        limit: 10
      });
    }
  });

  const latestAttempt = quizAttempts?.length ? 
    quizAttempts.reduce((latest, current) => 
      current.attempt_number > latest.attempt_number ? current : latest
    ) : null;

  const materials = course.materials || [];
  const remainingAttempts = course.quiz?.max_attempts ? 
    course.quiz.max_attempts - (quizAttempts?.length || 0) : 0;

  if (!hasAccess) return null;

  const handleQuizSubmitSuccess = () => {
    // Invalidate the quizAttempts query to refetch the latest attempts
    queryClient.invalidateQueries({ queryKey: ["quizAttempts", course.quiz?.id] });
  };

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
          {latestAttempt?.passed ? (
            <Button colorScheme="green" isDisabled>
              Passed 🎉 ({latestAttempt.score}%)
            </Button>
          ) : remainingAttempts > 0 ? (
            <Button 
              colorScheme="green" 
              onClick={onQuizOpen}
              isDisabled={!course.quiz || !course.is_active}
            >
              {latestAttempt ? 
                `Retry Quiz (${latestAttempt.score}%) - ${remainingAttempts} attempts left` : 
                'Take Quiz'}
            </Button>
          ) : (
            <Button colorScheme="red" isDisabled>
              No attempts remaining
            </Button>
          )}
        </Flex>
      </CardFooter>
      <OpenMaterialsViewer courseId={course.id} isOpen={isMaterialsOpen} onClose={onMaterialsClose} />
      {course.quiz && (
        <TakeQuiz 
          courseId={course.id} 
          quizData={course.quiz}
          isOpen={isQuizOpen} 
          onClose={onQuizClose} 
          onQuizSubmitSuccess={handleQuizSubmitSuccess} // Pass the success handler
        />
      )}
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
      <Navbar type="Course" addModalAs="symbol" />
      <CoursesGrid />
    </Container>
  );
}

export default Course;