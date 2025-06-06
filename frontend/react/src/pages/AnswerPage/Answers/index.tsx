import { CheckCircle, ThumbsDown, ThumbsUp } from "phosphor-react";
import { UserAvatar } from "../styles";
import {
  AnswerContent,
  AnswerDivider,
  AnswerFooter,
  AnswerHeader,
  AnswerItem,
  AnswersContainer,
  AnswersList,
  CorrectAnswerBadge,
  MarkCorrectButton,
  PaginationButton,
  PaginationContainer,
  SortingOptions,
  SortOption,
  VoteButton,
  VoteContainer,
  VoteCount,
  StatusMessage,
} from "./styles";
import React, { useContext, useState, useEffect, Suspense } from "react";
import { useAccount } from "@starknet-react/core";
import { shortenAddress } from "@utils/shortenAddress";
import { AnswersContext } from "../providers/AnswersProvider/answersContext";
import { useWallet } from "@hooks/useWallet";
import { useStatusMessage } from "@hooks/useStatusMessage";
import { useContractContext } from "@hooks/useContract/contractContext";
import type { Question } from "../types";

// Use named import for react-markdown
import { default as ReactMarkdown } from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnswersProps {
  question: Question;
  setQuestion: (question: Question) => void;
}

export function Answers({ question, setQuestion }: AnswersProps) {
  const [sortBy, setSortBy] = useState<"votes" | "date">("votes");
  const [currentPage, setCurrentPage] = useState(1);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { isConnected, address } = useAccount();
  const { openConnectModal } = useWallet();
  const { answers, setIsLoading, setAnswers } = useContext(AnswersContext);
  const { setStatusMessage, statusMessage } = useStatusMessage();
  const { callContract, getCorrectAnswer } = useContractContext();

  useEffect(() => {
    const fetchCorrectAnswer = async () => {
      try {
        const correctAnswer = await getCorrectAnswer(question.id);
        if (correctAnswer) {
          setCorrectAnswerId(correctAnswer.toString());
          setQuestion({ ...question, isOpen: false });
          setAnswers(
            answers.map((answer) => ({
              ...answer,
              isCorrect: answer.id === correctAnswer.toString(),
            })),
          );
        }
      } catch (error: any) {
        console.error("Error fetching correct answer:", error);
        setStatusMessage({ type: "error", message: `Failed to fetch correct answer: ${error.message || "Unknown error"}` });
      }
    };
    fetchCorrectAnswer();
  }, [question.id, getCorrectAnswer, setQuestion, answers, setAnswers, setStatusMessage]);

  const sortedAnswers = [...answers].sort((a, b) => {
    if (sortBy === "votes") {
      return b.votes - a.votes;
    } else {
      return a.timestamp.includes("Today") && !b.timestamp.includes("Today") ? -1 : 1;
    }
  });

  const handleMarkCorrect = async (answerId: string) => {
    if (!isConnected || !address) {
      openConnectModal();
      setStatusMessage({ type: "error", message: "Please connect your wallet." });
      return;
    }

    if (address.toLowerCase() !== question.authorAddress.toLowerCase()) {
      setStatusMessage({ type: "error", message: "Only the question author can mark an answer as correct." });
      return;
    }

    if (correctAnswerId) {
      setStatusMessage({ type: "error", message: "An answer has already been marked as correct." });
      return;
    }

    setIsLoading(true);
    setIsProcessing(true);
    setStatusMessage({ type: "info", message: "Processing transaction..." });

    try {
      await callContract({
        contractAddress: "0x0228432fe63e8808fd694c8c80f6266a735c340760812f64fe20b015d2b2700e",
        entrypoint: "mark_answer_as_correct",
        calldata: [answerId],
      });

      setCorrectAnswerId(answerId);
      setAnswers(
        answers.map((answer) => ({
          ...answer,
          isCorrect: answer.id === answerId,
        })),
      );
      setQuestion({ ...question, isOpen: false });

      setStatusMessage({
        type: "success",
        message: "Answer marked as correct! Rewards have been distributed to the responder.",
      });
    } catch (error: any) {
      console.error("Transaction error:", error);
      setStatusMessage({
        type: "error",
        message: `Failed to mark answer as correct: ${error.message || "Unknown error"}`,
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    }
  };

  const handleVote = async (answerId: string, direction: "up" | "down") => {
    if (!isConnected) {
      openConnectModal();
      return;
    }

    setAnswers(
      answers.map((answer) => {
        if (answer.id === answerId) {
          return {
            ...answer,
            votes: direction === "up" ? answer.votes + 1 : answer.votes - 1,
          };
        }
        return answer;
      }),
    );
  };

  const isQuestionAuthor = address && address.toLowerCase() === question.authorAddress.toLowerCase();
  const answersPerPage = 5;
  const totalPages = Math.ceil(answers.length / answersPerPage);
  const paginatedAnswers = sortedAnswers.slice(
    (currentPage - 1) * answersPerPage,
    currentPage * answersPerPage,
  );

  return (
    <AnswersContainer>
      <h2>Answers</h2>
      {statusMessage && (
        <StatusMessage type={statusMessage.type}>
          {statusMessage.type === "info" && <span>⏳</span>}
          {statusMessage.type === "success" && <CheckCircle size={16} weight="fill" />}
          {statusMessage.type === "error" && <span>❌</span>}
          {statusMessage.message}
        </StatusMessage>
      )}
      <SortingOptions>
        <SortOption active={sortBy === "votes"} onClick={() => setSortBy("votes")}>
          Votes
        </SortOption>
        <SortOption active={sortBy === "date"} onClick={() => setSortBy("date")}>
          Date
        </SortOption>
      </SortingOptions>

      <AnswersList>
        {paginatedAnswers.length === 0 ? (
          <p>No answers yet. Be the first to answer!</p>
        ) : (
          paginatedAnswers.map((answer) => (
            <AnswerItem key={answer.id} isCorrect={answer.isCorrect}>
              <AnswerHeader>
                <UserAvatar
                  src={`https://avatars.dicebear.com/api/identicon/${answer.authorAddress}.svg`}
                  alt={answer.authorName}
                />
                <div>
                  <span>{answer.authorName}</span>
                  <small>{shortenAddress(answer.authorAddress)}</small>
                  <time>{answer.timestamp}</time>
                </div>
                {answer.isCorrect && (
                  <CorrectAnswerBadge>
                    <CheckCircle size={16} weight="fill" />
                    Correct Answer
                  </CorrectAnswerBadge>
                )}
              </AnswerHeader>

              <AnswerContent>
                <Suspense fallback={<p>Loading preview...</p>}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      img: ({ ...props }) => (
                        <img
                          src={props.src || "/placeholder.svg"}
                          alt={props.alt || ""}
                          style={{ maxWidth: "100%", borderRadius: "4px", margin: "8px 0" }}
                        />
                      ),
                    }}
                  >
                    {answer.content}
                  </ReactMarkdown>
                </Suspense>
              </AnswerContent>

              <AnswerFooter>
                <VoteContainer>
                  <VoteButton onClick={() => handleVote(answer.id, "up")}>
                    <ThumbsUp size={16} />
                  </VoteButton>
                  <VoteCount>{answer.votes}</VoteCount>
                  <VoteButton onClick={() => handleVote(answer.id, "down")}>
                    <ThumbsDown size={16} />
                  </VoteButton>
                </VoteContainer>

                {isQuestionAuthor && question.isOpen && !correctAnswerId && (
                  <MarkCorrectButton onClick={() => handleMarkCorrect(answer.id)} disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Mark as Correct"}
                  </MarkCorrectButton>
                )}
              </AnswerFooter>
              <AnswerDivider />
            </AnswerItem>
          ))
        )}
      </AnswersList>

      {answers.length > answersPerPage && (
        <PaginationContainer>
          <PaginationButton disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
            Previous
          </PaginationButton>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <PaginationButton
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </PaginationButton>
        </PaginationContainer>
      )}
    </AnswersContainer>
  );
}