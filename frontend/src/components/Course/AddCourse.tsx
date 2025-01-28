import {
  Button,
  Checkbox,
  CheckboxGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  FormHelperText,
  Input,
  Menu,
  MenuButton,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  Icon,
  InputGroup,
  InputLeftElement,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm, Controller } from "react-hook-form"
import { ChevronDownIcon, SearchIcon } from "@chakra-ui/icons"
import { FiUsers, FiShield, FiCalendar, FiBook, FiFile, FiUpload } from "react-icons/fi"

import { 
  type CourseCreate, 
  type CoursesPublic, 
  type CoursePublic, 
  CoursesService, 
  UsersService, 
  type UserPublic, 
  RoleEnum,
} from "../../client"
import type { ApiError } from "../../client/core/ApiError"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"
import { useState, useEffect } from "react"

interface AddCourseProps {
  isOpen: boolean
  onClose: () => void
}

const AddCourse = ({ isOpen, onClose }: AddCourseProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()
  const [users, setUsers] = useState<UserPublic[]>([])
  const [userSearch, setUserSearch] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedRoleNames, setSelectedRoleNames] = useState<RoleEnum[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  useEffect(() => {
      UsersService.readUsers()
          .then((response) => setUsers(response.data))
          .catch((error) => console.error("Failed to fetch users:", error))
  }, [])

  const {
      register,
      handleSubmit,
      reset,
      control,
      setValue,
      formState: { errors, isSubmitting },
  } = useForm<CourseCreate>({
      mode: "onBlur",
      defaultValues: {
          title: "",
          description: "",
          materials: [],
          is_active: true,
          start_date: null,
          end_date: null,
          assigned_users: [],
          assigned_roles: [],
          create_quiz: false,
      },
  })

  const getUserById = (id: string) => {
      return users.find(u => u.id === id)
  }

  const filteredUsers = users
      .filter(user => 
          user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
          user.email.toLowerCase().includes(userSearch.toLowerCase())
      )
      .slice(0, 5)

  const handleFileUpload = async (files: FileList) => {
      const newUploadedFiles: string[] = []
      
      for (const file of Array.from(files)) {
          const formData = new FormData()
          formData.append('file', file)
          
          try {
              const filePath = await CoursesService.uploadMaterial({
                  formData: { file }
              })
              if (filePath) {
                  newUploadedFiles.push(filePath)
              }
          } catch (error) {
              console.error(`Failed to upload file ${file.name}:`, error)
              throw error
          }
      }
      
      setUploadedFiles(prev => [...prev, ...newUploadedFiles])
      return newUploadedFiles
  }

  const mutation = useMutation({
      mutationFn: async (data: CourseCreate) => {
          return CoursesService.createCourse({ 
              requestBody: {
                  ...data,
                  materials: uploadedFiles
              }
          })
      },
      onSuccess: () => {
          showToast("Success!", "Course created successfully.", "success")
          reset()
          setSelectedUserIds([])
          setSelectedRoleNames([])
          setUploadedFiles([])
          onClose()
      },
      onError: (err: ApiError) => {
          handleError(err, showToast)
      },
      onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["courses"] })
      },
  })

  const onSubmit: SubmitHandler<CourseCreate> = async (data) => {
      try {
          // Upload files first if any
          if (data.materials instanceof FileList && data.materials.length > 0) {
              await handleFileUpload(data.materials)
          }

          // Submit the course with the uploaded file paths
          await mutation.mutateAsync({
              ...data,
              assigned_roles: selectedRoleNames,
              assigned_users: selectedUserIds
          })
      } catch (error) {
          handleError(error as ApiError, showToast)
      }
  }

  return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
          <ModalOverlay />
          <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
              <ModalHeader>Add Course</ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                  <Flex direction="column" gap={4}>
                      <FormControl isRequired isInvalid={!!errors.title}>
                          <FormLabel>
                              <Flex align="center" gap={2}>
                                  <Icon as={FiBook} />
                                  Course Title
                              </Flex>
                          </FormLabel>
                          <Input 
                              {...register("title", { required: "Title is required" })} 
                              placeholder="Enter course title" 
                          />
                          {errors.title && <FormErrorMessage>{errors.title.message}</FormErrorMessage>}
                      </FormControl>

                      <FormControl isInvalid={!!errors.description}>
                          <FormLabel>
                              <Flex align="center" gap={2}>
                                  <Icon as={FiFile} />
                                  Description
                              </Flex>
                          </FormLabel>
                          <Textarea 
                              {...register("description")} 
                              placeholder="Enter course description" 
                          />
                          {errors.description && <FormErrorMessage>{errors.description.message}</FormErrorMessage>}
                      </FormControl>

                      <FormControl>
                          <FormLabel>
                              <Flex align="center" gap={2}>
                                  <Icon as={FiUpload} />
                                  Upload Materials
                              </Flex>
                          </FormLabel>
                          <Input 
                              type="file" 
                              multiple 
                              {...register("materials")} 
                              p={1}
                              accept=".pdf,.doc,.docx,.ppt,.pptx"
                          />
                          <FormHelperText>Upload course materials (PDF, DOC, PPT)</FormHelperText>
                          {uploadedFiles.length > 0 && (
                              <Wrap spacing={2} mt={2}>
                                  {uploadedFiles.map((file, index) => (
                                      <WrapItem key={index}>
                                          <Tag size="md" colorScheme="blue">
                                              <TagLabel>{file.split('_').pop()}</TagLabel>
                                              <TagCloseButton 
                                                  onClick={() => {
                                                      setUploadedFiles(prev => 
                                                          prev.filter((_, i) => i !== index)
                                                      )
                                                  }}
                                              />
                                          </Tag>
                                      </WrapItem>
                                  ))}
                              </Wrap>
                          )}
                      </FormControl>

                      <Flex gap={4}>
                          <FormControl>
                              <FormLabel>
                                  <Flex align="center" gap={2}>
                                      <Icon as={FiCalendar} />
                                      Start Date
                                  </Flex>
                              </FormLabel>
                              <Input type="date" {...register("start_date")} />
                          </FormControl>

                          <FormControl>
                              <FormLabel>
                                  <Flex align="center" gap={2}>
                                      <Icon as={FiCalendar} />
                                      End Date
                                  </Flex>
                              </FormLabel>
                              <Input type="date" {...register("end_date")} />
                          </FormControl>
                      </Flex>

                      <FormControl>
                          <FormLabel>
                              <Flex align="center" gap={2}>
                                  <Icon as={FiUsers} />
                                  Assigned Users
                              </Flex>
                          </FormLabel>
                          <Controller
                              name="assigned_users"
                              control={control}
                              render={({ field }) => (
                                  <Menu closeOnSelect={false}>
                                      <MenuButton
                                          as={Button}
                                          rightIcon={<ChevronDownIcon />}
                                          w="full"
                                          variant="outline"
                                          textAlign="left"
                                      >
                                          Select Users
                                      </MenuButton>
                                      <MenuList maxH="250px" overflowY="auto">
                                          <InputGroup px={3} pb={2}>
                                              <InputLeftElement>
                                                  <SearchIcon color="gray.400" />
                                              </InputLeftElement>
                                              <Input
                                                  placeholder="Search users..."
                                                  value={userSearch}
                                                  onChange={(e) => setUserSearch(e.target.value)}
                                                  variant="filled"
                                              />
                                          </InputGroup>
                                          <CheckboxGroup 
                                              value={selectedUserIds}
                                              onChange={(values) => {
                                                  const newValues = values as string[]
                                                  setSelectedUserIds(newValues)
                                                  field.onChange(newValues)
                                              }}
                                          >
                                              {filteredUsers.map((user) => (
                                                  <Flex key={user.id} px={3} py={1}>
                                                      <Checkbox value={user.id}>
                                                          <Flex direction="column">
                                                              <Text fontSize="sm">{user.name}</Text>
                                                              <Text fontSize="xs" color="gray.500">{user.email}</Text>
                                                          </Flex>
                                                      </Checkbox>
                                                  </Flex>
                                              ))}
                                              {filteredUsers.length === 0 && (
                                                  <Text px={3} py={2} color="gray.500">
                                                      No users found
                                                  </Text>
                                              )}
                                          </CheckboxGroup>
                                      </MenuList>
                                  </Menu>
                              )}
                          />
                          {selectedUserIds.length > 0 && (
                              <Wrap spacing={2} mt={2}>
                                  {selectedUserIds.map((id) => {
                                      const user = getUserById(id)
                                      return (
                                          <WrapItem key={id}>
                                              <Tag
                                                  size="md"
                                                  borderRadius="full"
                                                  variant="solid"
                                                  colorScheme="blue"
                                              >
                                                  <TagLabel>{user?.name || user?.email}</TagLabel>
                                                  <TagCloseButton
                                                      onClick={() => {
                                                          const newValues = selectedUserIds.filter(uid => uid !== id)
                                                          setSelectedUserIds(newValues)
                                                          setValue('assigned_users', newValues)
                                                      }}
                                                  />
                                              </Tag>
                                          </WrapItem>
                                      )
                                  })}
                              </Wrap>
                          )}
                      </FormControl>

                      <FormControl>
                          <FormLabel>
                              <Flex align="center" gap={2}>
                                  <Icon as={FiShield} />
                                  Assigned Roles
                              </Flex>
                          </FormLabel>
                          <Controller
                              name="assigned_roles"
                              control={control}
                              render={({ field }) => (
                                  <Menu closeOnSelect={false}>
                                      <MenuButton
                                          as={Button}
                                          rightIcon={<ChevronDownIcon />}
                                          w="full"
                                          variant="outline"
                                          textAlign="left"
                                      >
                                          Select Roles
                                      </MenuButton>
                                      <MenuList maxH="250px" overflowY="auto">
                                          <CheckboxGroup 
                                              value={selectedRoleNames}
                                              onChange={(values) => {
                                                  const newValues = values as RoleEnum[]
                                                  setSelectedRoleNames(newValues)
                                                  field.onChange(newValues)
                                              }}
                                          >
                                              {Object.values(RoleEnum).map((role) => (
                                                  <Flex key={role} px={3} py={1}>
                                                      <Checkbox value={role}>
                                                          {role}
                                                      </Checkbox>
                                                  </Flex>
                                              ))}
                                          </CheckboxGroup>
                                      </MenuList>
                                  </Menu>
                              )}
                          />
                          {selectedRoleNames.length > 0 && (
                              <Wrap spacing={2} mt={2}>
                                  {selectedRoleNames.map((role) => (
                                      <WrapItem key={role}>
                                          <Tag
                                              size="md"
                                              borderRadius="full"
                                              variant="solid"
                                              colorScheme="purple"
                                          >
                                              <TagLabel>{role}</TagLabel>
                                              <TagCloseButton
                                                  onClick={() => {
                                                      const newValues = selectedRoleNames.filter(r => r !== role)
                                                      setSelectedRoleNames(newValues)
                                                      setValue('assigned_roles', newValues)
                                                  }}
                                              />
                                          </Tag>
                                      </WrapItem>
                                  ))}
                              </Wrap>
                          )}
                      </FormControl>

                      <Flex gap={4}>
                          <Checkbox {...register("is_active")} defaultChecked>
                              Active
                          </Checkbox>
                          <Checkbox {...register("create_quiz")}>
                              Create Quiz
                          </Checkbox>
                      </Flex>
                  </Flex>
              </ModalBody>

              <ModalFooter gap={3}>
                  <Button variant="primary" type="submit" isLoading={isSubmitting}>
                      Save
                  </Button>
                  <Button onClick={onClose}>Cancel</Button>
              </ModalFooter>
          </ModalContent>
      </Modal>
  )
}

export default AddCourse