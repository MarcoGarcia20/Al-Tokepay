<?php

namespace App\Support;

use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;

class Money
{
    private BigDecimal $amount;

    public function __construct(int|float|string|self $value = 0)
    {
        if ($value instanceof self) {
            $this->amount = $value->amount;
        } elseif ($value instanceof BigDecimal) {
            $this->amount = $value;
        } else {
            $this->amount = BigDecimal::of((string) $value);
        }
    }

    public static function from(int|float|string|self $value): self
    {
        return new self($value);
    }

    public function add(self|int|float|string $addend): self
    {
        $addend = $addend instanceof self ? $addend->amount : BigDecimal::of((string) $addend);
        return new self($this->amount->plus($addend));
    }

    public function sub(self|int|float|string $subtrahend): self
    {
        $subtrahend = $subtrahend instanceof self ? $subtrahend->amount : BigDecimal::of((string) $subtrahend);
        return new self($this->amount->minus($subtrahend));
    }

    public function mul(self|int|float|string $multiplier): self
    {
        $multiplier = $multiplier instanceof self ? $multiplier->amount : BigDecimal::of((string) $multiplier);
        return new self($this->amount->multipliedBy($multiplier));
    }

    public function div(self|int|float|string $divisor, int $scale = 10): self
    {
        $divisor = $divisor instanceof self ? $divisor->amount : BigDecimal::of((string) $divisor);
        if ($divisor->isZero()) {
            return new self(0);
        }
        return new self($this->amount->dividedBy($divisor, $scale, RoundingMode::HalfUp));
    }

    public function pow(int|float $exponent): self
    {
        $base = (float) $this->amount->__toString();
        $result = $base ** $exponent;
        return new self((string) $result);
    }

    public function round(int $decimals = 2): self
    {
        return new self($this->amount->toScale($decimals, RoundingMode::HalfUp));
    }

    public function toFloat(int $decimals = 2): float
    {
        return (float) $this->round($decimals)->amount->__toString();
    }

    public function toString(int $decimals = 2): string
    {
        return $this->amount->toScale($decimals, RoundingMode::HalfUp)->__toString();
    }

    public function isZero(): bool
    {
        return $this->amount->isZero();
    }

    public function isGreaterThan(self|int|float|string $other): bool
    {
        $other = $other instanceof self ? $other->amount : BigDecimal::of((string) $other);
        return $this->amount->isGreaterThan($other);
    }

    public function isGreaterThanOrEqualTo(self|int|float|string $other): bool
    {
        $other = $other instanceof self ? $other->amount : BigDecimal::of((string) $other);
        return $this->amount->isGreaterThanOrEqualTo($other);
    }

    public function jsonSerialize(): float
    {
        return $this->toFloat();
    }

    public function __toString(): string
    {
        return $this->toString();
    }
}
