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
  Checkbox,
} from "@chakra-ui/react"
import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import { FaBook, FaCalendar, FaInfoCircle, FaUserTag } from "react-icons/fa"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm, Controller } from "react-hook-form"
import { useState, useEffect } from "react"
import {
  type ApiError,
  type CoursePublic,
  type CourseUpdate,
  CoursesService,
  RolesService,
} from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

interface EditCourseProps {
  course: CoursePublic
  isOpen: boolean
  onClose: () => void
}

interface FormInputs extends CourseUpdate {
  role_ids: string[]
}

const EditCourse = ({ course, isOpen, onClose }: EditCourseProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Fetch roles data
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => RolesService.getRoles(),
  })

  // Fetch current course roles
  const { data: courseDetails } = useQuery({
    queryKey: ["courseDetails", course.id],
    queryFn: () => CoursesService.readCourse({ courseId: course.id }),
    enabled: isOpen,
  })

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormInputs>({
    mode: "onBlur",
    defaultValues: {
      title: course.title,
      description: course.description || "",
      materials: course.materials || [],
      is_active: course.is_active,
      start_date: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
      end_date: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
      role_ids: [],
    },
  })

  useEffect(() => {
    if (courseDetails?.roles) {
      setValue('role_ids', courseDetails.roles.map(role => role.id))
    }
  }, [courseDetails, setValue])

  const handleClose = () => {
    reset()
    onClose()
  }

  const mutation = useMutation({
    mutationFn: async (data: FormInputs) => {
      setSubmitting(true)
      try {
        const updatedCourse = await CoursesService.updateCourse({
          courseId: course.id,
          requestBody: {
            title: data.title,
            description: data.description,
            materials: data.materials || [],
            is_active: data.is_active,
            start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : null,
            end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : null,
          },
        })

        const currentRoles = courseDetails?.roles?.map(role => role.id) || []
        
        const rolesToAdd = data.role_ids.filter(id => !currentRoles.includes(id))
        for (const roleId of rolesToAdd) {
          try {
            await CoursesService.assignRoleToCourse({
              courseId: course.id,
              roleId: roleId,
            })
          } catch (error) {
            console.error(`Failed to add role ${roleId}:`, error)
            showToast(
              "Warning",
              `Failed to add role. Please try again.`,
              "warning"
            )
          }
        }

        return updatedCourse
      } finally {
        setSubmitting(false)
      }
    },
    onSuccess: () => {
      showToast("Success!", "Course updated successfully.", "success")
      queryClient.invalidateQueries({ queryKey: ["courses"] })
      queryClient.invalidateQueries({ queryKey: ["courseDetails"] })
      handleClose()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
  })

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    mutation.mutate(data)
  }

  const filteredRoles = roles?.data?.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size={{ base: "sm", md: "lg" }} 
      isCentered
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Edit Course</ModalHeader>
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
                render={({ field: { value, onChange } }) => (
                  <>
                    <Menu closeOnSelect={false} matchWidth={true}>
                      <MenuButton 
                        as={Button} 
                        rightIcon={<ChevronDownIcon />}
                        w="100%"
                        textAlign="left"
                        variant="outline"
                      >
                        {value.length ? `${value.length} role(s) selected` : 'Select roles'}
                      </MenuButton>
                      <MenuList 
                        maxH="200px" 
                        overflowY="auto" 
                        w="100%"
                        minW="unset"
                        position="relative"
                        p={0}
                      >
                        <Box 
                          position="sticky"
                          top={0}
                          bg="inherit"
                          zIndex={1}
                          borderBottom="1px"
                          borderColor="gray.200"
                          _dark={{
                            borderColor: "gray.600",
                            bg: "gray.700"
                          }}
                        >
                          <Box px={4} py={2}>
                            <InputGroup size="sm">
                              <InputLeftElement>
                                <SearchIcon color="gray.400" />
                              </InputLeftElement>
                              <Input
                                placeholder="Search roles..."
                                value={searchQuery}
                                autoComplete="off"
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setSearchQuery(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                  }
                                  e.stopPropagation();
                                }}
                              />
                            </InputGroup>
                          </Box>
                        </Box>
                        {filteredRoles.map((role) => (
                          <MenuItem
                            key={role.id}
                            onClick={() => {
                              const newValue = value.includes(role.id)
                                ? value.filter(id => id !== role.id)
                                : [...value, role.id]
                              onChange(newValue)
                            }}
                            px={4}
                            py={2}
                          >
                            <Checkbox
                              isChecked={value.includes(role.id)}
                              mr={3}
                              pointerEvents="none"
                            >
                              {role.name}
                            </Checkbox>
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Menu>
                    <Flex mt={2} gap={2} flexWrap="wrap">
                      {value.map((roleId) => {
                        const role = roles?.data.find(r => r.id === roleId)
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
                              onClick={async (e) => {
                                e.preventDefault()
                                try {
                                  await CoursesService.unassignRoleFromCourse({
                                    courseId: course.id,
                                    roleId: roleId,
                                  })
                                  onChange(value.filter(id => id !== roleId))
                                  queryClient.invalidateQueries({ queryKey: ["courses"] })
                                  queryClient.invalidateQueries({ queryKey: ["courseDetails"] })
                                  showToast("Success!", "Role removed successfully.", "success")
                                } catch (error) {
                                  console.error(`Failed to remove role ${roleId}:`, error)
                                  showToast(
                                    "Error",
                                    "Failed to remove role. Please try again.",
                                    "error"
                                  )
                                }
                              }}
                            />
                          </Tag>
                        ) : null
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
          <Button onClick={handleClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default EditCourse