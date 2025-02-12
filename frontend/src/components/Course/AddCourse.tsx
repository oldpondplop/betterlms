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
} from "@chakra-ui/react";
import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons';
import { FaBook, FaCalendar, FaInfoCircle, FaUserTag, FaUser, FaUpload } from "react-icons/fa";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type SubmitHandler, useForm, Controller } from "react-hook-form";
import { useState } from "react";
import { 
  CoursesService,
  RolesService,
  UsersService,
  type Body_courses_upload_materials,
} from "../../client";
import useCustomToast from "../../hooks/useCustomToast";

interface AddCourseProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormInputs {
  title: string;
  description?: string | null;
  materials?: File[];
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  role_ids: string[];
  user_ids: string[];
}

const AddCourse = ({ isOpen, onClose }: AddCourseProps) => {
  const queryClient = useQueryClient();
  const showToast = useCustomToast();
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
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
      user_ids: [],
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const filteredRoles = roles?.data?.filter(role => 
    role.name.toLowerCase().includes(roleSearchQuery.toLowerCase())
  ) || [];

  const filteredUsers = users?.data?.filter(user => 
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  ) || [];

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    try {
      setSubmitting(true);

      const course = await CoursesService.createCourse({
        requestBody: {
          title: data.title,
          description: data.description,
          is_active: data.is_active,
          start_date: data.start_date ? new Date(data.start_date).toISOString().split('T')[0] : null,
          end_date: data.end_date ? new Date(data.end_date).toISOString().split('T')[0] : null,
        },
      });

      if (data.materials?.length) {
        const body: Body_courses_upload_materials = {
          files: data.materials,
        };

        await CoursesService.uploadMaterials({
          courseId: course.id,
          formData: body,
        });
      }

      if (data.role_ids?.length) {
        await Promise.all(
          data.role_ids.map((roleId) =>
            CoursesService.assignRoleToCourse({
              courseId: course.id,
              roleId,
            })
          )
        );
      }

      if (data.user_ids?.length) {
        await Promise.all(
          data.user_ids.map((userId) =>
            CoursesService.assignUserToCourse({
              courseId: course.id,
              userId,
            })
          )
        );
      }

      showToast('Success!', 'Course created successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      handleClose();
    } catch (error) {
      showToast('Error', error instanceof Error ? error.message : 'Failed to create course', 'error');
    } finally {
      setSubmitting(false);
    }
  };

return (
 <Modal isOpen={isOpen} onClose={handleClose} size={{ base: "sm", md: "lg" }} isCentered>
   <ModalOverlay />
   <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
     <ModalHeader>Add New Course</ModalHeader>
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
               <Input {...register("start_date")} type="date" />
             </FormControl>
           </GridItem>

           <GridItem>
             <FormControl>
               <FormLabel>
                 <Icon as={FaCalendar} mr={2} />
                 End Date
               </FormLabel>
               <Input {...register("end_date")} type="date" />
             </FormControl>
           </GridItem>
         </Grid>

         <FormControl>
           <FormLabel>
             <Icon as={FaUpload} mr={2} />
             Materials
           </FormLabel>
           <Controller
             name="materials"
             control={control}
             defaultValue={[]}
             render={({ field: { onChange } }) => (
               <Input
                 type="file"
                 multiple
                 accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                 onChange={(e) => {
                   const files = Array.from(e.target.files || []);
                   onChange(files);
                 }}
               />
             )}
           />
         </FormControl>

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
                             value={roleSearchQuery}
                             autoComplete="off"
                             onClick={(e) => e.stopPropagation()}
                             onChange={(e) => {
                               e.stopPropagation();
                               setRoleSearchQuery(e.target.value);
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
                     const role = roles?.data?.find(r => r.id === roleId)
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
                           onClick={(e) => {
                             e.preventDefault();
                             onChange(value.filter(id => id !== roleId));
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

         <FormControl>
           <FormLabel>
             <Icon as={FaUser} mr={2} />
             Assign to Users
           </FormLabel>
           <Controller
             name="user_ids"
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
                     {value.length ? `${value.length} user(s) selected` : 'Select users'}
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
                             placeholder="Search users..."
                             value={userSearchQuery}
                             autoComplete="off"
                             onClick={(e) => e.stopPropagation()}
                             onChange={(e) => {
                               e.stopPropagation();
                               setUserSearchQuery(e.target.value);
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
                     {filteredUsers.map((user) => (
                       <MenuItem
                         key={user.id}
                         onClick={() => {
                           const newValue = value.includes(user.id)
                             ? value.filter(id => id !== user.id)
                             : [...value, user.id]
                           onChange(newValue)
                         }}
                         px={4}
                         py={2}
                       >
                         <Checkbox
                           isChecked={value.includes(user.id)}
                           mr={3}
                           pointerEvents="none"
                         >
                           {user.name}
                         </Checkbox>
                       </MenuItem>
                     ))}
                   </MenuList>
                 </Menu>
                 <Flex mt={2} gap={2} flexWrap="wrap">
                   {value.map((userId) => {
                     const user = users?.data?.find(u => u.id === userId)
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
                           onClick={(e) => {
                             e.preventDefault();
                             onChange(value.filter(id => id !== userId));
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
           <Switch id="is_active" {...register("is_active")} defaultChecked />
         </FormControl>
       </VStack>
     </ModalBody>

     <ModalFooter gap={3}>
       <Button variant="primary" type="submit" isLoading={submitting}>
         Create Course
       </Button>
       <Button onClick={handleClose}>Cancel</Button>
     </ModalFooter>
   </ModalContent>
 </Modal>
  );
};

export default AddCourse;