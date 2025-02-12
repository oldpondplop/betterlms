import { useState } from 'react';
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
  Switch,
  Flex,
  Alert,
  AlertIcon,
  Progress,
  CircularProgress,
  CircularProgressLabel,
} from "@chakra-ui/react";
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { QuizzesService } from '../../client';

export const Route = createFileRoute('/_layout/analytics')({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  const { data: attempts, isPending, error } = useQuery({
    queryKey: ['all-quiz-attempts', showActiveOnly],
    queryFn: () => QuizzesService.getAllQuizAttempts(),
  });

  const stats = attempts ? {
    totalUsers: new Set(attempts.map(a => a.user_id)).size,
    passRate: (attempts.filter(a => a.passed).length / attempts.length * 100).toFixed(1),
    avgScore: (attempts.reduce((acc, curr) => acc + curr.score, 0) / attempts.length).toFixed(1),
    totalAttempts: attempts.length,
  } : null;

  if (error) {
    return (
      <Container maxW="full">
        <Alert status="error" mt={4}>
          <AlertIcon />
          Error loading analytics: {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="full">
      {/* Header */}
      <Heading size="lg" pt={12} mb={8}>Analytics Dashboard</Heading>

      {/* Stats Cards */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={6} mb={8}>
        <Card bg="gray.800">
          <CardBody>
            <Stat>
              <StatLabel color="gray.400">Total Users</StatLabel>
              <StatNumber color="white">{stats?.totalUsers || 0}</StatNumber>
              <StatHelpText color="green.400">
                <StatArrow type="increase" />
                25%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="gray.800">
          <CardBody>
            <Stat>
              <StatLabel color="gray.400">Pass Rate</StatLabel>
              <StatNumber color="white">{stats?.passRate || 0}%</StatNumber>
              <StatHelpText color="green.400">
                <StatArrow type="increase" />
                12%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="gray.800">
          <CardBody>
            <Stat>
              <StatLabel color="gray.400">Average Score</StatLabel>
              <StatNumber color="white">{stats?.avgScore || 0}%</StatNumber>
              <StatHelpText color="red.400">
                <StatArrow type="decrease" />
                5%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="gray.800">
          <CardBody>
            <Stat>
              <StatLabel color="gray.400">Total Attempts</StatLabel>
              <StatNumber color="white">{stats?.totalAttempts || 0}</StatNumber>
              <StatHelpText color="green.400">
                <StatArrow type="increase" />
                8%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Performance Cards */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6} mb={8}>
        <Card bg="gray.800">
          <CardBody>
            <Text fontSize="lg" fontWeight="medium" color="white" mb={4}>Course Performance</Text>
            <Stack spacing={4}>
              {attempts && [...new Set(attempts.map(a => a.course_name))].map(course => {
                const courseAttempts = attempts.filter(a => a.course_name === course);
                const passRate = (courseAttempts.filter(a => a.passed).length / courseAttempts.length * 100).toFixed(1);
                return (
                  <Box key={course}>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Box>
                        <Text color="white">{course}</Text>
                        <Flex gap={2} align="center">
                          <Box
                            w="2"
                            h="2"
                            borderRadius="50%"
                            bg={courseAttempts[0]?.course_is_active ? "green.400" : "red.400"}
                          />
                          <Text fontSize="sm" color="gray.400">
                            {courseAttempts[0]?.course_is_active ? 'Active' : 'Inactive'}
                          </Text>
                        </Flex>
                      </Box>
                      <Box textAlign="right">
                        <Text color="white" fontWeight="medium">{passRate}%</Text>
                        <Text fontSize="sm" color="gray.400">
                          {courseAttempts.length} attempts
                        </Text>
                      </Box>
                    </Flex>
                    <Progress value={parseFloat(passRate)} size="sm" colorScheme="blue" borderRadius="full" />
                  </Box>
                );
              })}
            </Stack>
          </CardBody>
        </Card>

        <Card bg="gray.800">
          <CardBody>
            <Text fontSize="lg" fontWeight="medium" color="white" mb={6}>Score Distribution</Text>
            {attempts && (
              <Grid templateColumns="repeat(3, 1fr)" gap={6}>
                {/* Pass/Fail Chart */}
                <Box position="relative">
                  <CircularProgress
                    value={100}
                    size="180px"
                    thickness="12px"
                    color="red.400"
                  >
                    <CircularProgress
                      value={attempts.filter(a => a.passed).length / attempts.length * 100}
                      size="180px"
                      thickness="12px"
                      color="green.400"
                      position="absolute"
                      top={0}
                    >
                      <CircularProgressLabel color="white">
                        <Flex direction="column" align="center">
                          <Text fontSize="2xl">{(attempts.filter(a => a.passed).length / attempts.length * 100).toFixed(0)}%</Text>
                          <Text fontSize="sm" color="gray.400">Pass Rate</Text>
                          <Flex gap={2} fontSize="xs" mt={1}>
                            <Text color="green.400">■ Passed</Text>
                            <Text color="red.400">■ Failed</Text>
                          </Flex>
                        </Flex>
                      </CircularProgressLabel>
                    </CircularProgress>
                  </CircularProgress>
                </Box>

                {/* In Progress Chart */}
                <Box position="relative">
                  <CircularProgress
                    value={100}
                    size="180px"
                    thickness="12px"
                    color="gray.600"
                  >
                    <CircularProgress
                      value={attempts.filter(a => a.attempt_number > 1).length / attempts.length * 100}
                      size="180px"
                      thickness="12px"
                      color="blue.400"
                      position="absolute"
                      top={0}
                    >
                      <CircularProgressLabel color="white">
                        <Flex direction="column" align="center">
                          <Text fontSize="2xl">{(attempts.filter(a => a.attempt_number > 1).length / attempts.length * 100).toFixed(0)}%</Text>
                          <Text fontSize="sm" color="gray.400">Retaking</Text>
                          <Flex gap={2} fontSize="xs" mt={1}>
                            <Text color="blue.400">■ Multiple</Text>
                            <Text color="gray.400">■ First Try</Text>
                          </Flex>
                        </Flex>
                      </CircularProgressLabel>
                    </CircularProgress>
                  </CircularProgress>
                </Box>

                {/* Score Excellence Chart */}
                <Box position="relative">
                  <CircularProgress
                    value={100}
                    size="180px"
                    thickness="12px"
                    color="gray.600"
                  >
                    <CircularProgress
                      value={attempts.filter(a => a.score >= 90).length / attempts.length * 100}
                      size="180px"
                      thickness="12px"
                      color="purple.400"
                      position="absolute"
                      top={0}
                    >
                      <CircularProgressLabel color="white">
                        <Flex direction="column" align="center">
                          <Text fontSize="2xl">{(attempts.filter(a => a.score >= 90).length / attempts.length * 100).toFixed(0)}%</Text>
                          <Text fontSize="sm" color="gray.400">Excellence</Text>
                          <Flex gap={2} fontSize="xs" mt={1}>
                            <Text color="purple.400">■ 90%+</Text>
                            <Text color="gray.400">■ &lt;90%</Text>
                          </Flex>
                        </Flex>
                      </CircularProgressLabel>
                    </CircularProgress>
                  </CircularProgress>
                </Box>
              </Grid>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* Attempts Table */}
      <Card bg="gray.800">
        <CardBody>
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="lg" fontWeight="medium" color="white">All Attempts</Text>
            <Flex align="center" gap={2}>
              <Text fontSize="sm" color="gray.400">Show Active Courses Only</Text>
              <Switch
                isChecked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                colorScheme="green"
                size="md"
              />
            </Flex>
          </Flex>
          <TableContainer>
            <Table size={{ base: "sm", md: "md" }} variant="simple">
              <Thead>
                <Tr>
                  <Th color="gray.400">User</Th>
                  <Th color="gray.400">Score</Th>
                  <Th color="gray.400">Status</Th>
                  <Th color="gray.400">Attempt</Th>
                  <Th color="gray.400">Course</Th>
                  <Th color="gray.400">Course Status</Th>
                  <Th color="gray.400">Date</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isPending ? (
                  <Tr>
                    {[...Array(7)].map((_, idx) => (
                      <Td key={idx}>
                        <SkeletonText noOfLines={1} paddingBlock="16px" />
                      </Td>
                    ))}
                  </Tr>
                ) : (
                  attempts?.filter(attempt => !showActiveOnly || attempt.course_is_active)
                    .map((attempt) => (
                    <Tr key={attempt.id}>
                      <Td>
                        <Box>
                          <Text color="white">{attempt.user_name}</Text>
                          <Text fontSize="sm" color="gray.400">
                            {attempt.user_email}
                          </Text>
                        </Box>
                      </Td>
                      <Td color="white">{attempt.score}%</Td>
                      <Td>
                        <Badge
                          colorScheme={attempt.passed ? "green" : "red"}
                          variant="subtle"
                        >
                          {attempt.passed ? "Passed" : "Failed"}
                        </Badge>
                      </Td>
                      <Td color="white">#{attempt.attempt_number}</Td>
                      <Td color="white">{attempt.course_name}</Td>
                      <Td>
                        <Flex gap={2} align="center">
                          <Box
                            w="2"
                            h="2"
                            borderRadius="50%"
                            bg={attempt.course_is_active ? "green.400" : "red.400"}
                          />
                          <Text color="white">
                            {attempt.course_is_active ? "Active" : "Inactive"}
                          </Text>
                        </Flex>
                      </Td>
                      <Td color="white">
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
        </CardBody>
      </Card>
    </Container>
  );
}

export default AnalyticsPage;