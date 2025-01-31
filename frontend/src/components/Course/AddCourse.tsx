import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Textarea,
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  Flex,
  Tag,
  TagLabel,
  TagCloseButton,
  Box,
  InputGroup,
  InputLeftElement,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons';
import { FaBook, FaCalendar, FaInfoCircle, FaUserTag, FaUser } from "react-icons/fa";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type SubmitHandler, useForm, Controller } from "react-hook-form";
import { useState } from "react";
import { 
  type CourseCreate, 
  CoursesService,
  RolesService,
  UsersService,
} from "../../client";
import useCustomToast from "../../hooks/useCustomToast";

interface AddCourseProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormInputs extends CourseCreate {
  role_ids: string[];
  user_ids: string[]; // New field for user assignments
}

const AddCourse = ({ isOpen, onClose }: AddCourseProps) => {
  const queryClient = useQueryClient();
  const showToast = useCustomToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState(""); // New state for user search
  const [submitting, setSubmitting] = useState(false);

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => RolesService.getRoles(),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => UsersService.getUsers(),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormInputs>({
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      materials: [],
      is_active: true,
      start_date: null,
      end_date: null,
      role_ids: [],
      user_ids: [], // Initialize user_ids
    },
  });

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    try {
      setSubmitting(true);

      // Create course
      const course = await CoursesService.createCourse({ 
        requestBody: {
          title: data.title,
          description: data.description,
          materials: data.materials || [],
          is_active: data.is_active,
          start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : null,
          end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : null,
        }
      });

      // If roles are selected, assign them
      if (data.role_ids?.length > 0) {
        for (const roleId of data.role_ids) {
          await CoursesService.assignRoleToCourse({
            courseId: course.id,
            roleId: roleId,
          });
        }
      }

      // If users are selected, assign them
      if (data.user_ids?.length > 0) {
        for (const userId of data.user_ids) {
          await CoursesService.assignUserToCourse({
            courseId: course.id,
            userId: userId,
          });
        }
      }

      showToast("Success!", "Course created and assigned successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      reset();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      showToast(
        "Error",
        error instanceof Error ? error.message : "Failed to create course",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles = roles?.data?.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredUsers = users?.data?.filter(user => 
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase())
  ) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "sm", md: "lg" }} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Add Course</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!errors.title}>
              <FormLabel>
                <Icon as={FaBook} mr={2} />
                Title
              </FormLabel>
              <Input
                {...register("title", {
                  required: "Title is required.",
                  maxLength: {
                    value: 255,
                    message: "Title cannot exceed 255 characters.",
                  },
                })}
                placeholder="Course Title"
              />
              {errors.title && (
                <FormErrorMessage>{errors.title.message}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>
                <Icon as={FaInfoCircle} mr={2} />
                Description
              </FormLabel>
              <Textarea
                {...register("description", {
                  maxLength: {
                    value: 500,
                    message: "Description cannot exceed 500 characters.",
                  },
                })}
                placeholder="Course Description"
                rows={3}
              />
              {errors.description && (
                <FormErrorMessage>{errors.description.message}</FormErrorMessage>
              )}
            </FormControl>

            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <FormControl>
                  <FormLabel>
                    <Icon as={FaCalendar} mr={2} />
                    Start Date
                  </FormLabel>
                  <Input
                    {...register("start_date")}
                    type="date"
                  />
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl>
                  <FormLabel>
                    <Icon as={FaCalendar} mr={2} />
                    End Date
                  </FormLabel>
                  <Input
                    {...register("end_date")}
                    type="date"
                  />
                </FormControl>
              </GridItem>
            </Grid>

            <FormControl>
              <FormLabel>
                <Icon as={FaUserTag} mr={2} />
                Assign to Roles
              </FormLabel>
              <Controller
                name="role_ids"
                control={control}
                defaultValue={[]}
                render={({ field: { value, onChange } }) => (
                  <>
                    <Menu closeOnSelect={false}>
                      <MenuButton 
                        as={Button} 
                        rightIcon={<ChevronDownIcon />}
                        w="100%"
                        textAlign="left"
                        variant="outline"
                      >
                        {value.length ? `${value.length} role(s) selected` : 'Select roles'}
                      </MenuButton>
                      <MenuList maxH="200px" overflowY="auto">
                        <Box px={4} pb={2}>
                          <InputGroup size="sm">
                            <InputLeftElement>
                              <SearchIcon color="gray.400" />
                            </InputLeftElement>
                            <Input
                              placeholder="Search roles..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </InputGroup>
                        </Box>
                        {filteredRoles.map((role) => (
                          <MenuItem
                            key={role.id}
                            onClick={() => {
                              if (!value.includes(role.id)) {
                                onChange([...value, role.id]);
                              }
                            }}
                          >
                            {role.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                    <Flex mt={2} gap={2} flexWrap="wrap">
                      {value.map((roleId) => {
                        const role = roles?.data.find(r => r.id === roleId);
                        return role ? (
                          <Tag
                            key={roleId}
                            size="md"
                            borderRadius="full"
                            variant="solid"
                            colorScheme="blue"
                          >
                            <TagLabel>{role.name}</TagLabel>
                            <TagCloseButton
                              onClick={() => {
                                onChange(value.filter(id => id !== roleId));
                              }}
                            />
                          </Tag>
                        ) : null;
                      })}
                    </Flex>
                  </>
                )}
              />
            </FormControl>

            {/* New Section: Assign to Users */}
            <FormControl>
              <FormLabel>
                <Icon as={FaUser} mr={2} />
                Assign to Users
              </FormLabel>
              <Controller
                name="user_ids"
                control={control}
                defaultValue={[]}
                render={({ field: { value, onChange } }) => (
                  <>
                    <Menu closeOnSelect={false}>
                      <MenuButton 
                        as={Button} 
                        rightIcon={<ChevronDownIcon />}
                        w="100%"
                        textAlign="left"
                        variant="outline"
                      >
                        {value.length ? `${value.length} user(s) selected` : 'Select users'}
                      </MenuButton>
                      <MenuList maxH="200px" overflowY="auto">
                        <Box px={4} pb={2}>
                          <InputGroup size="sm">
                            <InputLeftElement>
                              <SearchIcon color="gray.400" />
                            </InputLeftElement>
                            <Input
                              placeholder="Search users..."
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                            />
                          </InputGroup>
                        </Box>
                        {filteredUsers.map((user) => (
                          <MenuItem
                            key={user.id}
                            onClick={() => {
                              if (!value.includes(user.id)) {
                                onChange([...value, user.id]);
                              }
                            }}
                          >
                            {user.name}
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                    <Flex mt={2} gap={2} flexWrap="wrap">
                      {value.map((userId) => {
                        const user = users?.data.find(u => u.id === userId);
                        return user ? (
                          <Tag
                            key={userId}
                            size="md"
                            borderRadius="full"
                            variant="solid"
                            colorScheme="blue"
                          >
                            <TagLabel>{user.name}</TagLabel>
                            <TagCloseButton
                              onClick={() => {
                                onChange(value.filter(id => id !== userId));
                              }}
                            />
                          </Tag>
                        ) : null;
                      })}
                    </Flex>
                  </>
                )}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="is_active" mb="0">
                <Icon as={FaInfoCircle} mr={2} />
                Active Status
              </FormLabel>
              <Switch
                id="is_active"
                {...register("is_active")}
                defaultChecked
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button 
            variant="primary" 
            type="submit"
            isLoading={submitting}
          >
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AddCourse;