import React, { useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, QuizzesService } from "../../client";
import useCustomToast from "../../hooks/useCustomToast";
import { handleError } from "../../utils";

interface DeleteQuizProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
  quizTitle?: string;
}

const DeleteQuiz: React.FC<DeleteQuizProps> = ({ 
  isOpen, 
  onClose, 
  quizId, 
  quizTitle 
}) => {
  const queryClient = useQueryClient();
  const showToast = useCustomToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteQuizMutation = useMutation({
    mutationFn: () => QuizzesService.deleteQuiz({ quizId }),
    onSuccess: () => {
      showToast("Success", "Quiz deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      onClose();
    },
    onError: (error) => {
      console.error('Delete quiz error:', error);
      handleError(error as ApiError, showToast);
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  const handleDelete = () => {
    setIsDeleting(true);
    deleteQuizMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Delete Quiz</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>
            Are you sure you want to delete the quiz 
            {quizTitle && <strong> "{quizTitle}"</strong>}?
          </Text>
          <Text mt={2} color="red.500" fontSize="sm">
            This action cannot be undone. The quiz and all its associated data will be permanently removed.
          </Text>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button 
            colorScheme="red" 
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            Delete
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClose}
            isDisabled={isDeleting}
          >
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default DeleteQuiz;