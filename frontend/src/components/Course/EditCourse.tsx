import {
    Button,
    Checkbox,
    CheckboxGroup,
    Flex,
    FormControl,
    FormErrorMessage,
    FormLabel,
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
    type CoursePublic, 
    CoursesService, 
    UsersService, 
    type UserPublic, 
    RoleEnum
} from "../../client"
import type { ApiError } from "../../client/core/ApiError"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"
import { useState, useEffect } from "react"

interface EditCourseProps {
    isOpen: boolean
    onClose: () => void
    course: CoursePublic
}

const EditCourse = ({ isOpen, onClose, course }: EditCourseProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
    const [users, setUsers] = useState<UserPublic[]>([])
    const [userSearch, setUserSearch] = useState("")
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>(course.assigned_users || [])
    const [selectedRoleNames, setSelectedRoleNames] = useState<RoleEnum[]>(course.assigned_roles || [])
    const [uploadedFiles, setUploadedFiles] = useState<string[]>(course.materials || [])

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
            title: course.title,
            description: course.description,
            materials: course.materials,
            is_active: course.is_active,
            start_date: course.start_date,
            end_date: course.end_date,
            assigned_users: course.assigned_users || [],
            assigned_roles: course.assigned_roles || [],
            create_quiz: false,
        },
    })

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
                showToast("Error", `Failed to upload file ${file.name}`, "error")
                throw error
            }
        }

        console.log("Uploaded files:", newUploadedFiles)
        setUploadedFiles(prev => [...prev, ...newUploadedFiles])
        return newUploadedFiles
    }

    const mutation = useMutation({
        mutationFn: async (data: CourseCreate) => {
            console.log("🚀 Final API Request Body:", JSON.stringify(data));
    
            return CoursesService.updateCourse({ 
                courseId: course.id, 
                requestBody: {
                    ...data,
                    materials: uploadedFiles,
                    assigned_users: selectedUserIds.length > 0 ? selectedUserIds : [],
                    assigned_roles: selectedRoleNames.length > 0 ? selectedRoleNames : [],
                    is_active: data.is_active ?? true,
                },
            });
        },
        onSuccess: () => {
            console.log("Mutation success - Course updated!");
            showToast("Success!", "Course updated successfully.", "success");
            reset();
            setSelectedUserIds([]);
            setSelectedRoleNames([]);
            setUploadedFiles([]);
            onClose();
        },
        onError: (err: ApiError) => {
            console.error("Mutation error:", err);
            handleError(err, showToast);
        },
        onSettled: () => {
            console.log("Mutation settled - Invalidating cache");
            queryClient.invalidateQueries({ queryKey: ["courses"] });
        },
    });
    

    const onSubmit: SubmitHandler<CourseCreate> = async (data) => {
        console.log("Form submitted with data:", data);
    
        try {
            let uploadedPaths = uploadedFiles; // Keep existing uploaded files
    
            if (data.materials instanceof FileList && data.materials.length > 0) {
                uploadedPaths = await handleFileUpload(data.materials);
            }
    
            await mutation.mutateAsync({
                ...data,
                materials: uploadedPaths, // Ensure API gets an array of strings
                assigned_roles: selectedRoleNames,
                assigned_users: selectedUserIds,
                is_active: data.is_active ?? true, // Ensure this is always set
            });
        } catch (error) {
            console.error("Error submitting form:", error);
            handleError(error as ApiError, showToast);
        }
    };
    

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
            <ModalOverlay />
            <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
                <ModalHeader>Edit Course</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <Flex direction="column" gap={4}>
                        <FormControl isRequired isInvalid={!!errors.title}>
                            <FormLabel><Icon as={FiBook} mr={2} /> Course Title</FormLabel>
                            <Input {...register("title", { required: "Title is required" })} placeholder="Enter course title" />
                            <FormErrorMessage>{errors.title?.message}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.description}>
                            <FormLabel><Icon as={FiFile} mr={2} /> Description</FormLabel>
                            <Textarea {...register("description")} placeholder="Enter course description" />
                            <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
                        </FormControl>

                        <FormControl>
                            <FormLabel><Icon as={FiUpload} mr={2} /> Upload Materials</FormLabel>
                            <Input type="file" multiple {...register("materials")} />
                            {uploadedFiles.length > 0 && (
                                <Wrap mt={2}>
                                    {uploadedFiles.map((file, index) => (
                                        <WrapItem key={index}>
                                            <Tag colorScheme="blue">
                                                <TagLabel>{file.split('_').pop()}</TagLabel>
                                                <TagCloseButton onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))} />
                                            </Tag>
                                        </WrapItem>
                                    ))}
                                </Wrap>
                            )}
                        </FormControl>

                        <Flex gap={4}>
                            <FormControl><FormLabel><Icon as={FiCalendar} mr={2} /> Start Date</FormLabel><Input type="date" {...register("start_date")} /></FormControl>
                            <FormControl><FormLabel><Icon as={FiCalendar} mr={2} /> End Date</FormLabel><Input type="date" {...register("end_date")} /></FormControl>
                        </Flex>
                    </Flex>
                        <FormControl>
                            <FormLabel><Icon as={FiUsers} mr={2} /> Assigned Users</FormLabel>
                            <Controller
                                name="assigned_users"
                                control={control}
                                render={({ field }) => (
                                    <Menu closeOnSelect={false}>
                                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} w="full" variant="outline" textAlign="left">
                                            Select Users
                                        </MenuButton>
                                        <MenuList maxH="250px" overflowY="auto">
                                            <InputGroup px={3} pb={2}>
                                                <InputLeftElement><SearchIcon color="gray.400" /></InputLeftElement>
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
                                                    const newValues = values as string[];
                                                    setSelectedUserIds(newValues);
                                                    field.onChange(newValues);
                                                }}
                                            >
                                                {users
                                                    .filter(user =>
                                                        user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                        user.email.toLowerCase().includes(userSearch.toLowerCase())
                                                    )
                                                    .slice(0, 5)
                                                    .map((user) => (
                                                        <Flex key={user.id} px={3} py={1}>
                                                            <Checkbox value={user.id}>
                                                                <Flex direction="column">
                                                                    <Text fontSize="sm">{user.name}</Text>
                                                                    <Text fontSize="xs" color="gray.500">{user.email}</Text>
                                                                </Flex>
                                                            </Checkbox>
                                                        </Flex>
                                                    ))}
                                                {users.length === 0 && <Text px={3} py={2} color="gray.500">No users found</Text>}
                                            </CheckboxGroup>
                                        </MenuList>
                                    </Menu>
                                )}
                            />
                            {selectedUserIds.length > 0 && (
                                <Wrap spacing={2} mt={2}>
                                    {selectedUserIds.map((id) => {
                                        const user = users.find(u => u.id === id);
                                        return (
                                            <WrapItem key={id}>
                                                <Tag size="md" borderRadius="full" variant="solid" colorScheme="blue">
                                                    <TagLabel>{user?.name || user?.email}</TagLabel>
                                                    <TagCloseButton
                                                        onClick={() => {
                                                            const newValues = selectedUserIds.filter(uid => uid !== id);
                                                            setSelectedUserIds(newValues);
                                                            setValue('assigned_users', newValues);
                                                        }}
                                                    />
                                                </Tag>
                                            </WrapItem>
                                        );
                                    })}
                                </Wrap>
                            )}
                        </FormControl>
                        <FormControl>
                            <FormLabel><Icon as={FiShield} mr={2} /> Assigned Roles</FormLabel>
                            <Controller
                                name="assigned_roles"
                                control={control}
                                render={({ field }) => (
                                    <Menu closeOnSelect={false}>
                                        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} w="full" variant="outline" textAlign="left">
                                            Select Roles
                                        </MenuButton>
                                        <MenuList maxH="250px" overflowY="auto">
                                            <CheckboxGroup 
                                                value={selectedRoleNames}
                                                onChange={(values) => {
                                                    const newValues = values as RoleEnum[];
                                                    setSelectedRoleNames(newValues);
                                                    field.onChange(newValues);
                                                }}
                                            >
                                                {Object.values(RoleEnum).map((role) => (
                                                    <Flex key={role} px={3} py={1}>
                                                        <Checkbox value={role}>{role}</Checkbox>
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
                                            <Tag size="md" borderRadius="full" variant="solid" colorScheme="purple">
                                                <TagLabel>{role}</TagLabel>
                                                <TagCloseButton
                                                    onClick={() => {
                                                        const newValues = selectedRoleNames.filter(r => r !== role);
                                                        setSelectedRoleNames(newValues);
                                                        setValue('assigned_roles', newValues);
                                                    }}
                                                />
                                            </Tag>
                                        </WrapItem>
                                    ))}
                                </Wrap>
                            )}
                        </FormControl>

                </ModalBody>

                <ModalFooter>
                    <Button type="submit" isLoading={isSubmitting}>Save</Button>
                    <Button onClick={onClose} ml={2}>Cancel</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

export default EditCourse