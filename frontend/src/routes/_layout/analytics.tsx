import {
  Badge,
  Box,
  Container,
  Grid,
  Heading,
  SkeletonText,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Card,
  CardBody,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { QuizzesService } from "../../client";

export const Route = createFileRoute("/_layout/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: attempts, isPending, error } = useQuery({
    queryKey: ["all-quiz-attempts"],
    queryFn: () => QuizzesService.getAllQuizAttempts(),
  });

  const stats = attempts ? {
    totalUsers: new Set(attempts.map(a => a.user_id)).size,
    passRate: (attempts.filter(a => a.passed).length / attempts.length * 100).toFixed(1),
    avgScore: (attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length).toFixed(1),
  } : null;

  if (error) {
    return (
      <Container maxW="full">
        <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
          Error Loading Analytics
        </Heading>
        <Text color="red.500" mt={4}>{error.message}</Text>
      </Container>
    );
  }

  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12} mb={8}>
        Quiz Attempts Analytics
      </Heading>

      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Users</StatLabel>
              <StatNumber>{stats?.totalUsers || 0}</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />25%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Pass Rate</StatLabel>
              <StatNumber>{stats?.passRate || 0}%</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Average Score</StatLabel>
              <StatNumber>{stats?.avgScore || 0}%</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6} mb={8}>
        <Card>
          <CardBody>
            <Text fontSize="lg" fontWeight="medium" mb={4}>Course Performance</Text>
            <Stack spacing={3}>
              {attempts && [...new Set(attempts.map(a => a.course_name))].map(course => {
                const courseAttempts = attempts.filter(a => a.course_name === course);
                const passRate = (courseAttempts.filter(a => a.passed).length / courseAttempts.length * 100).toFixed(1);
                return (
                  <Box key={course}>
                    <Text mb={1}>{course}</Text>
                    <Text fontSize="sm" color="gray.500">{passRate}% pass rate</Text>
                  </Box>
                );
              })}
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Text fontSize="lg" fontWeight="medium" mb={4}>Recent Activity</Text>
            <Stack spacing={3}>
              {attempts?.slice(0, 3).map(attempt => (
                <Box key={attempt.id} p={3} borderWidth="1px" borderRadius="md">
                  <Text fontWeight="medium">{attempt.user_name}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Completed {attempt.course_name} with {attempt.score}%
                  </Text>
                </Box>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <TableContainer>
        <Table size={{ base: "sm", md: "md" }}>
          <Thead>
            <Tr>
              <Th>User</Th>
              <Th>Score</Th>
              <Th>Status</Th>
              <Th>Attempt</Th>
              <Th>Course</Th>
              <Th>Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isPending ? (
              <Tr>
                {[...Array(6)].map((_, idx) => (
                  <Td key={idx}>
                    <SkeletonText noOfLines={1} paddingBlock="16px" />
                  </Td>
                ))}
              </Tr>
            ) : (
              attempts?.map((attempt) => (
                <Tr key={attempt.id}>
                  <Td>
                    <Box>
                      <Text fontWeight="medium">{attempt.user_name}</Text>
                      <Text fontSize="sm" color="gray.500">
                        {attempt.user_email}
                      </Text>
                    </Box>
                  </Td>
                  <Td>{attempt.score}%</Td>
                  <Td>
                    <Badge
                      colorScheme={attempt.passed ? "green" : "red"}
                      variant="subtle"
                    >
                      {attempt.passed ? "Passed" : "Failed"}
                    </Badge>
                  </Td>
                  <Td>#{attempt.attempt_number}</Td>
                  <Td>{attempt.course_name}</Td>
                  <Td>
                    {new Date(attempt.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default AnalyticsPage;